import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { createRequire } from "node:module";
import { open, readFile, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

import { SUPPORTED_PROFILE, inspectTurbopackEmission } from "./inspect-turbopack-emission.mjs";
import { routePaths } from "./verify-origin-artifacts.mjs";

const VERIFIER_URL = import.meta.url;
const require = createRequire(VERIFIER_URL);
const acorn = require("next/dist/compiled/acorn/acorn");

export const INSPECTION_LIMITS = Object.freeze({
  htmlFiles: 22,
  entriesPerRoute: 512,
  jsFiles: 256,
  bytesPerFile: 8 * 1024 * 1024,
  totalBytes: 64 * 1024 * 1024,
});

export const FORBIDDEN_INITIAL_MARKERS = Object.freeze([
  "qr-code-styling",
  "updateVendorMatrix",
  "getModuleCount",
  "svg2pdf",
  "jsPDF",
]);

const SCOPE = "HTML_ROOTS_AND_STATIC_ESM_ONLY";
const SYNTHETIC_ORIGIN = "https://bundle-inspection.invalid";
const CHUNK_PREFIX = "/_next/static/chunks/";
const INERT_SCRIPT_TYPES = new Set(["application/json", "application/ld+json"]);
const CLASSIC_SCRIPT_TYPES = new Set(["", "text/javascript", "application/javascript"]);
const SEGMENT = /^[A-Za-z0-9_.-]+$/;
const ASCII_WHITESPACE = /[\t\n\f\r ]+/;

class InspectionIssue extends Error {
  constructor(code, subject, span) {
    super(code);
    this.code = code;
    this.subject = subject;
    this.span = span;
  }
}

export class BundleBoundaryError extends Error {
  constructor(code, reasonCodes = []) {
    super(code);
    this.name = "BundleBoundaryError";
    this.code = code;
    // Fixed enum reason codes only; never payloads, paths or caught exception text.
    this.reasonCodes = Object.freeze([...reasonCodes]);
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function within(parent, child) {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

function diagnostic(code, subject, span, reason) {
  return {
    code,
    subject,
    ...(reason ? { reason } : {}),
    ...(span ? { span } : {}),
  };
}

function spanOf(node) {
  return { end: node.end, start: node.start };
}

function normalizeChunkUrl(raw) {
  if (typeof raw !== "string" || raw !== raw.trim() || /[\\\u0000-\u001f\u007f]/.test(raw)) {
    throw new InspectionIssue("UNSUPPORTED_ASSET_URL", "html-entry");
  }
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("%")) {
    throw new InspectionIssue("UNSUPPORTED_ASSET_URL", "html-entry");
  }
  const rawPath = raw.split(/[?#]/, 1)[0];
  const rawTail = rawPath.startsWith(CHUNK_PREFIX) ? rawPath.slice(CHUNK_PREFIX.length) : "";
  const rawSegments = rawTail.split("/");
  if (!rawTail || rawSegments.some((part) => !part || part === "." || part === ".." || !SEGMENT.test(part))) {
    throw new InspectionIssue("UNSUPPORTED_ASSET_URL", "html-entry");
  }
  let url;
  try {
    url = new URL(raw, SYNTHETIC_ORIGIN);
  } catch {
    throw new InspectionIssue("UNSUPPORTED_ASSET_URL", "html-entry");
  }
  if (url.origin !== SYNTHETIC_ORIGIN || !url.pathname.startsWith(CHUNK_PREFIX)) {
    throw new InspectionIssue("UNSUPPORTED_ASSET_URL", "html-entry");
  }
  const tail = url.pathname.slice(CHUNK_PREFIX.length);
  const segments = tail.split("/");
  if (!tail.endsWith(".js") || segments.some((part) => !part || part === "." || part === ".." || !SEGMENT.test(part))) {
    throw new InspectionIssue("UNSUPPORTED_ASSET_URL", "html-entry");
  }
  return { alias: raw, path: `${CHUNK_PREFIX}${segments.join("/")}` };
}

function normalizeStaticSpecifier(specifier, importerPath) {
  if (typeof specifier !== "string" || specifier !== specifier.trim() || /[\\\u0000-\u001f\u007f%?#]/.test(specifier)) {
    throw new InspectionIssue("UNSUPPORTED_STATIC_SPECIFIER", importerPath);
  }
  if (specifier.startsWith(CHUNK_PREFIX)) return normalizeChunkUrl(specifier).path;
  if (!specifier.startsWith("./")) throw new InspectionIssue("UNSUPPORTED_STATIC_SPECIFIER", importerPath);
  const importerSegments = importerPath.slice(CHUNK_PREFIX.length).split("/");
  importerSegments.pop();
  const parts = specifier.slice(2).split("/");
  if (!specifier.endsWith(".js") || parts.some((part) => !part || part === "." || part === ".." || !SEGMENT.test(part))) {
    throw new InspectionIssue("UNSUPPORTED_STATIC_SPECIFIER", importerPath);
  }
  return `${CHUNK_PREFIX}${[...importerSegments, ...parts].join("/")}`;
}

function isPrimitive(node) {
  return node?.type === "Literal"
    && (node.value === null || typeof node.value === "string" || typeof node.value === "boolean"
      || (typeof node.value === "number" && Number.isFinite(node.value)))
    && !node.regex && typeof node.bigint === "undefined";
}

function isPrimitiveExpression(node) {
  return isPrimitive(node) || (node?.type === "UnaryExpression" && node.operator === "void" && isPrimitive(node.argument));
}

function validConstDeclaration(node) {
  return node?.type === "VariableDeclaration" && node.kind === "const" && node.declarations.length > 0
    && node.declarations.every((decl) => decl.id.type === "Identifier" && isPrimitive(decl.init));
}

function hasImportAttributes(node, tokens) {
  if (node.attributes?.length || node.assertions?.length) return true;
  return tokens.some((token) => token.start >= node.source.end && token.end <= node.end
    && token.type.label !== ";" && token.type.label !== "eof");
}

function inspectSyntax(buffer, path, mode) {
  let program;
  const tokens = [];
  try {
    const source = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    program = acorn.parse(source, {
      ecmaVersion: "latest",
      sourceType: mode === "module" ? "module" : "script",
      allowHashBang: false,
      onToken: tokens,
    });
  } catch (error) {
    const position = Number.isInteger(error?.pos) ? error.pos : 0;
    return {
      diagnostics: [diagnostic("UNSUPPORTED_EXECUTABLE_FORM", path,
        { end: position, start: position }, "PARSE_OR_ENCODING_FAILURE")],
      edges: [],
    };
  }

  const diagnostics = [];
  const edges = [];
  for (const node of program.body) {
    let supported = false;
    try {
      if (node.type === "EmptyStatement") supported = true;
      else if (node.type === "ExpressionStatement" && isPrimitiveExpression(node.expression)) supported = true;
      else if (validConstDeclaration(node)) supported = true;
      else if (mode === "module" && node.type === "ImportDeclaration" && node.specifiers.length === 0
        && isPrimitive(node.source) && typeof node.source.value === "string" && !hasImportAttributes(node, tokens)) {
        edges.push(normalizeStaticSpecifier(node.source.value, path));
        supported = true;
      } else if (mode === "module" && node.type === "ExportAllDeclaration" && node.exported == null
        && isPrimitive(node.source) && typeof node.source.value === "string" && !hasImportAttributes(node, tokens)) {
        edges.push(normalizeStaticSpecifier(node.source.value, path));
        supported = true;
      } else if (mode === "module" && node.type === "ExportNamedDeclaration" && !node.source
        && node.specifiers.length === 0 && validConstDeclaration(node.declaration)) supported = true;
    } catch (error) {
      if (error instanceof InspectionIssue) {
        diagnostics.push(diagnostic(error.code, error.subject, spanOf(node),
          "STATIC_SPECIFIER_OUTSIDE_CLOSED_LOCAL_GRAMMAR"));
      } else {
        diagnostics.push(diagnostic("UNSUPPORTED_EXECUTABLE_FORM", path, spanOf(node),
          "TOP_LEVEL_PRODUCTION_OUTSIDE_CLOSED_SUBSET"));
      }
      continue;
    }
    if (!supported) diagnostics.push(diagnostic("UNSUPPORTED_EXECUTABLE_FORM", path, spanOf(node),
      "TOP_LEVEL_PRODUCTION_OUTSIDE_CLOSED_SUBSET"));
  }
  return { diagnostics, edges: [...new Set(edges)].sort() };
}

function fileIdentity(stat) {
  return [stat.dev, stat.ino, stat.size, stat.mtimeNs, stat.ctimeNs].map(String).join(":");
}

async function readOneBuffer(path, perFileLimit, state, subject) {
  let handle;
  try {
    handle = await open(path, "r");
    const before = await handle.stat({ bigint: true });
    if (!before.isFile()) throw new InspectionIssue("UNSUPPORTED_NON_REGULAR_FILE", subject);
    if (before.size > BigInt(perFileLimit)) throw new InspectionIssue("UNSUPPORTED_RESOURCE_LIMIT", subject);
    if (state.totalBytes + Number(before.size) > INSPECTION_LIMITS.totalBytes) {
      throw new InspectionIssue("UNSUPPORTED_RESOURCE_LIMIT", subject);
    }
    const buffer = Buffer.alloc(Number(before.size));
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    const after = await handle.stat({ bigint: true });
    if (offset !== buffer.length || fileIdentity(before) !== fileIdentity(after)) {
      throw new InspectionIssue("CHANGED_INPUT_DURING_INSPECTION", subject);
    }
    state.totalBytes += buffer.length;
    state.fileReads.set(subject, (state.fileReads.get(subject) || 0) + 1);
    return buffer;
  } catch (error) {
    if (error instanceof InspectionIssue) throw error;
    throw new InspectionIssue("UNREADABLE_REQUIRED_FILE", subject);
  } finally {
    await handle?.close().catch(() => {});
  }
}

async function resolveAsset(pathname, lexicalChunksRoot, chunksRoot) {
  const relativePath = pathname.slice(CHUNK_PREFIX.length);
  const lexicalPath = resolve(lexicalChunksRoot, relativePath);
  if (!within(lexicalChunksRoot, lexicalPath)) throw new InspectionIssue("ASSET_PATH_ESCAPE", pathname);
  let resolvedPath;
  try {
    resolvedPath = await realpath(lexicalPath);
  } catch {
    throw new InspectionIssue("MISSING_DECLARED_ASSET", pathname);
  }
  if (!within(chunksRoot, resolvedPath)) throw new InspectionIssue("ASSET_PATH_ESCAPE", pathname);
  return resolvedPath;
}

function asciiTokens(value) {
  return (value || "").split(ASCII_WHITESPACE).filter(Boolean).map(asciiLower);
}

function asciiTrimLower(value) {
  return asciiLower((value || "").replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, ""));
}

function asciiLower(value) {
  return value.replace(/[A-Z]/g, (character) => character.toLowerCase());
}

function linkModes(node) {
  const rel = new Set(asciiTokens(node.getAttribute("rel")));
  const modes = new Set();
  if (rel.has("modulepreload")) modes.add("module");
  if (rel.has("preload") && asciiTrimLower(node.getAttribute("as")) === "script") modes.add("classic");
  return modes;
}

function scriptMode(node) {
  const type = (node.getAttribute("type") || "").trim().toLowerCase();
  if (INERT_SCRIPT_TYPES.has(type)) return "inert";
  if (type === "module") return "module";
  if (CLASSIC_SCRIPT_TYPES.has(type)) return "classic";
  throw new InspectionIssue("UNSUPPORTED_SCRIPT_TYPE", "html-entry");
}

function finalize(state) {
  const sortDiagnostics = (a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b));
  state.diagnostics.sort(sortDiagnostics);
  state.entries.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  state.edges.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  state.assets.sort((a, b) => a.path.localeCompare(b.path));
  state.html.sort((a, b) => a.path.localeCompare(b.path));
  const fileReads = [...state.fileReads.entries()]
    .map(([path, count]) => ({ count, path }))
    .sort((a, b) => a.path.localeCompare(b.path));
  const syntaxUnsupported = state.diagnostics.some((item) =>
    item.code === "UNSUPPORTED_EXECUTABLE_FORM" || item.code === "UNSUPPORTED_STATIC_SPECIFIER"
      || item.code === "UNSUPPORTED_SCRIPT_TYPE" || item.code === "UNSUPPORTED_LINK_MODE"
      || item.code === "UNSUPPORTED_MIXED_SCRIPT_MODE");
  const markerFailure = state.diagnostics.some((item) => item.code === "FORBIDDEN_INITIAL_MARKER");
  const unsupportedInspection = state.diagnostics.some((item) =>
    item.code === "UNSUPPORTED_RESOURCE_LIMIT" || item.code === "UNSUPPORTED_HTML");
  const assetFailure = state.diagnostics.some((item) => item.code !== "UNSUPPORTED_EXECUTABLE_FORM"
    && item.code !== "UNSUPPORTED_STATIC_SPECIFIER" && item.code !== "UNSUPPORTED_SCRIPT_TYPE"
    && item.code !== "UNSUPPORTED_LINK_MODE"
    && item.code !== "UNSUPPORTED_MIXED_SCRIPT_MODE" && item.code !== "UNSUPPORTED_RESOURCE_LIMIT"
    && item.code !== "UNSUPPORTED_HTML");
  const manifest = state.assets.map(({ path, sha256: digest }) => ({ sha256: digest, path }));
  const inputFiles = [...state.html, ...state.assets]
    .map(({ path, sha256: digest }) => ({ sha256: digest, path }))
    .sort((a, b) => a.path.localeCompare(b.path));
  return {
    schemaVersion: 1,
    scope: SCOPE,
    assetChecks: markerFailure || assetFailure ? "FAIL" : syntaxUnsupported || unsupportedInspection ? "UNSUPPORTED" : "PASS",
    moduleSyntax: syntaxUnsupported ? "UNSUPPORTED" : unsupportedInspection ? "NOT_CHECKED"
      : state.assets.length ? "PASS_CLOSED_STATIC_SUBSET" : "NOT_CHECKED",
    runtimeProvenance: "NEEDS_EMISSION_REVIEW",
    browserStartupTiming: "UNVERIFIED",
    releaseDecision: "BLOCKED",
    evidence: {
      routes: [...routePaths],
      entries: state.entries,
      html: state.html,
      assets: state.assets,
      staticEdges: state.edges,
      diagnostics: state.diagnostics,
      fileReads,
      assetManifest: { schemaVersion: 1, assets: manifest },
      assetManifestSha256: sha256(JSON.stringify({ schemaVersion: 1, assets: manifest })),
      inputManifest: { schemaVersion: 1, files: inputFiles },
      inputManifestSha256: sha256(JSON.stringify({ schemaVersion: 1, files: inputFiles })),
      parser: { module: "next/dist/compiled/acorn/acorn", sourceType: "script-or-module" },
      totalBytes: state.totalBytes,
    },
  };
}

export async function inspectInitialBundleBoundary(buildDir = ".next") {
  const state = {
    assets: [], diagnostics: [], edges: [], entries: [], fileReads: new Map(), html: [], totalBytes: 0,
  };
  let buildRoot;
  let chunksRoot;
  const lexicalBuildRoot = resolve(buildDir);
  const lexicalChunksRoot = join(lexicalBuildRoot, "static/chunks");
  try {
    buildRoot = await realpath(lexicalBuildRoot);
    chunksRoot = await realpath(lexicalChunksRoot);
    if (!within(buildRoot, chunksRoot)) throw new InspectionIssue("ASSET_PATH_ESCAPE", CHUNK_PREFIX);
  } catch (error) {
    const issue = error instanceof InspectionIssue ? error : new InspectionIssue("UNREADABLE_BUILD_ROOT", "build-root");
    state.diagnostics.push(diagnostic(issue.code, issue.subject));
    return finalize(state);
  }

  const pending = new Map();
  const allModes = new Map();
  const inline = [];
  for (const route of routePaths) {
    const requestedHtmlPath = join(buildRoot, "server/app", `${route.slice(1)}.html`);
    let buffer;
    try {
      const htmlPath = await realpath(requestedHtmlPath);
      if (!within(buildRoot, htmlPath)) throw new InspectionIssue("HTML_PATH_ESCAPE", route);
      buffer = await readOneBuffer(htmlPath, INSPECTION_LIMITS.bytesPerFile, state, route);
      state.html.push({
        path: `server/app/${route.slice(1)}.html`,
        route,
        sha256: sha256(buffer),
        size: buffer.length,
      });
    } catch (error) {
      state.diagnostics.push(diagnostic(error instanceof InspectionIssue ? error.code : "UNREADABLE_REQUIRED_FILE", route));
      continue;
    }
    let dom;
    try {
      dom = new JSDOM(new TextDecoder("utf-8", { fatal: true }).decode(buffer), {
        virtualConsole: new VirtualConsole(),
      });
      const nodes = [...dom.window.document.querySelectorAll("script, link")]
        .filter((node) => node.tagName.toLowerCase() === "script" || linkModes(node).size > 0);
      if (nodes.length > INSPECTION_LIMITS.entriesPerRoute) {
        state.diagnostics.push(diagnostic("UNSUPPORTED_RESOURCE_LIMIT", route));
        continue;
      }
      let declaredExecutable = 0;
      for (let index = 0; index < nodes.length; index += 1) {
        const node = nodes[index];
        const tag = node.tagName.toLowerCase();
        let modes;
        if (tag === "script") {
          let mode;
          try {
            mode = scriptMode(node);
          } catch (error) {
            state.diagnostics.push(diagnostic(error.code, route));
            continue;
          }
          if (mode === "inert") {
            state.entries.push({ kind: "inert-script", route });
            continue;
          }
          modes = new Set([mode]);
        } else {
          modes = linkModes(node);
          if (modes.size > 1) state.diagnostics.push(diagnostic("UNSUPPORTED_LINK_MODE", route));
        }
        const src = tag === "script" ? node.getAttribute("src") : node.getAttribute("href");
        if (src == null) {
          if (tag === "link") {
            state.diagnostics.push(diagnostic("UNSUPPORTED_ASSET_URL", route));
            continue;
          }
          const mode = [...modes][0];
          const inlinePath = `inline:${route}:${index}`;
          const inlineBuffer = Buffer.from(node.textContent || "");
          if (state.totalBytes + inlineBuffer.length > INSPECTION_LIMITS.totalBytes) {
            state.diagnostics.push(diagnostic("UNSUPPORTED_RESOURCE_LIMIT", inlinePath));
            continue;
          }
          state.totalBytes += inlineBuffer.length;
          state.entries.push({ kind: "inline-script", mode, route, sha256: sha256(inlineBuffer) });
          inline.push({ buffer: inlineBuffer, mode, path: inlinePath });
          declaredExecutable += 1;
          continue;
        }
        try {
          const normalized = normalizeChunkUrl(src);
          const mode = modes.size === 1 ? [...modes][0] : "conflict";
          const kind = tag === "script" ? "script" : "preload";
          state.entries.push({ alias: normalized.alias, kind, mode, path: normalized.path, route });
          declaredExecutable += 1;
          const assetModes = allModes.get(normalized.path) || new Set();
          for (const assetMode of modes) assetModes.add(assetMode);
          allModes.set(normalized.path, assetModes);
          pending.set(normalized.path, assetModes);
        } catch (error) {
          state.diagnostics.push(diagnostic(error.code || "UNSUPPORTED_ASSET_URL", route));
        }
      }
      if (declaredExecutable === 0) state.diagnostics.push(diagnostic("MISSING_DECLARED_SCRIPT_ROOT", route));
    } catch {
      state.diagnostics.push(diagnostic("UNSUPPORTED_HTML", route));
    } finally {
      dom?.window.close();
    }
  }

  for (const item of inline) {
    const inspected = inspectSyntax(item.buffer, item.path, item.mode);
    state.diagnostics.push(...inspected.diagnostics);
    if (inspected.edges.length) state.diagnostics.push(diagnostic("UNSUPPORTED_STATIC_SPECIFIER", item.path));
    for (const marker of FORBIDDEN_INITIAL_MARKERS) {
      if (item.buffer.includes(Buffer.from(marker))) state.diagnostics.push(diagnostic("FORBIDDEN_INITIAL_MARKER", item.path));
    }
  }

  const visited = new Set();
  while (pending.size > 0) {
    const path = [...pending.keys()].sort()[0];
    const modes = pending.get(path);
    pending.delete(path);
    if (visited.has(path)) continue;
    if (visited.size >= INSPECTION_LIMITS.jsFiles) {
      state.diagnostics.push(diagnostic("UNSUPPORTED_RESOURCE_LIMIT", path));
      break;
    }
    visited.add(path);
    if (modes.size !== 1) {
      state.diagnostics.push(diagnostic("UNSUPPORTED_MIXED_SCRIPT_MODE", path));
      continue;
    }
    let resolvedPath;
    let buffer;
    try {
      resolvedPath = await resolveAsset(path, lexicalChunksRoot, chunksRoot);
      buffer = await readOneBuffer(resolvedPath, INSPECTION_LIMITS.bytesPerFile, state, path);
    } catch (error) {
      state.diagnostics.push(diagnostic(error.code || "UNREADABLE_REQUIRED_FILE", path));
      continue;
    }
    const digest = sha256(buffer);
    state.assets.push({ path, sha256: digest, size: buffer.length });
    for (const marker of FORBIDDEN_INITIAL_MARKERS) {
      if (buffer.includes(Buffer.from(marker))) state.diagnostics.push(diagnostic("FORBIDDEN_INITIAL_MARKER", path));
    }
    const mode = [...modes][0];
    const inspected = inspectSyntax(buffer, path, mode);
    state.diagnostics.push(...inspected.diagnostics);
    for (const target of inspected.edges) {
      state.edges.push({ from: path, to: target });
      const targetModes = allModes.get(target) || new Set();
      targetModes.add("module");
      allModes.set(target, targetModes);
      if (visited.has(target) && targetModes.size !== 1) {
        state.diagnostics.push(diagnostic("UNSUPPORTED_MIXED_SCRIPT_MODE", target));
      }
      pending.set(target, targetModes);
    }
  }
  return finalize(state);
}

// Trusted admission boundary (NQR129 §4). An acceptance record counts only when the SHA-256 of its exact bytes
// is listed here, in reviewed source. No argument, file, flag, reviewer name or caller hash can extend this set,
// so a locally authored record stays BLOCKED until PM admits real QA/review evidence through a reviewed change.
// Revoking evidence means removing its digest. The gate revision hashes this file with this one declaration
// normalized to an empty list, so admitting a record never changes the logic revision the record is bound to.
// The list is data only: each entry is one lowercase 64-hex string literal on its own line ("  \"<hex>\",").
// Any other spelling, code or a second declaration makes the gate revision unreadable, which blocks.
// Admission checklist (Stage B SECURITY C1/C2): add a digest only after QA, TL and SECURITY have inspected every
// startupChunks entry for PDF-specific or unreviewed code, and after the dependency pin in build.mjs is current.
export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([]);

const ADMISSION_DECLARATION = /^export const ADMITTED_ACCEPTANCE_SHA256 = Object\.freeze\(\[(?:\n {2}"[a-f0-9]{64}",)*\n?\]\);$/gm;
const ADMISSION_STATEMENT = /^export const ADMITTED_ACCEPTANCE_SHA256\b/gm;
const EMPTY_ADMISSION_DECLARATION = "export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([]);";
// Captured at load so later prototype changes cannot widen admission.
const ADMITTED_SET = new Set(ADMITTED_ACCEPTANCE_SHA256);
const setHas = Set.prototype.has;
const isAdmitted = (digest) => typeof digest === "string" && Reflect.apply(setHas, ADMITTED_SET, [digest]);

export const BUNDLE_DECISION = Object.freeze({ PASS: "PASS_BUNDLE_SCOPE", BLOCKED: "BLOCKED", FAIL: "FAIL" });

const ALL_ROUTES = Object.freeze([...SUPPORTED_PROFILE.routes].sort());
const GENERATOR_ROUTES = Object.freeze(ALL_ROUTES.filter((route) => route.includes("/qr/")));

// NQR129 §7: startup and warm repetition cover landing plus generator routes; generator interactions cover
// every generator route. Each scenario must list exactly its set, once each.
export const TIMING_SCENARIO_ROUTES = Object.freeze({
  COLD_EMPTY_INVALID_STARTUP: ALL_ROUTES,
  COLD_VALID_INITIAL_PREVIEW: GENERATOR_ROUTES,
  EMPTY_TO_VALID_PREVIEW: GENERATOR_ROUTES,
  NON_PDF_ACTIONS: GENERATOR_ROUTES,
  FIRST_ELIGIBLE_PDF_REQUEST: GENERATOR_ROUTES,
  WARM_REPETITION: ALL_ROUTES,
});
export const REQUIRED_TIMING_SCENARIOS = Object.freeze(Object.keys(TIMING_SCENARIO_ROUTES));

// NQR129 §4 per-class closure: which reviewed adapter predicate closes each legacy closed-grammar gap. A class
// closes only when the adapter returns STATIC_SUPPORTED for the same admitted bytes. Resource limits,
// unreadable/escaped inputs and forbidden markers have no closure.
export const LEGACY_CLOSURE = Object.freeze({
  UNSUPPORTED_EXECUTABLE_FORM: "every top-level statement matched a reviewed Flight, registration, factory or import form",
  UNSUPPORTED_STATIC_SPECIFIER: "every static import normalized to a contained static/chunks path",
  UNSUPPORTED_SCRIPT_TYPE: "every executable script type is in the reviewed set; inert JSON is not executed",
  UNSUPPORTED_LINK_MODE: "every preload/modulepreload records one execution mode per chunk",
  UNSUPPORTED_MIXED_SCRIPT_MODE: "no chunk is admitted with conflicting execution modes",
});

const REQUIRED_REVIEW_ROLES = Object.freeze(["QA", "SECURITY", "TL"]);
const ACCEPTANCE_BYTES_LIMIT = 12 * 1024 * 1024;
const HEX_64 = /^[a-f0-9]{64}$/;
const LOCAL_ORIGIN = /^http:\/\/(?:127\.0\.0\.1|localhost):([1-9][0-9]{0,4})$/;
const DECISION_INPUT_KEYS = "acceptanceBytes,gateRevision,inspection,legacyInspection,origin,startupScan";
const GATE_REVISION_KEYS = "adapterSha256,buildWrapperSha256,originArtifactsSha256,originGateSha256,verifierLogicSha256";
const RECORD_KEYS = "expectedInputs,gateRevision,policyVersion,productionOrigin,profileId,reviews,schemaVersion,startupChunks,"
  + "timingEvidence";
const TIMING_KEYS = "artifactFullSha256,artifactScopeSha256,browser,buildId,collectedAt,evidenceBundleSha256,localOrigin,"
  + "policyVersion,scenarios,schemaVersion";
const SCENARIO_KEYS = "id,observationsSha256,postIdentitySha256,preIdentitySha256,routes,state,status";
const REVIEW_KEYS = "disposition,reportSha256,reviewedGateRevisionSha256,role";

function plainRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  return Object.values(Object.getOwnPropertyDescriptors(value))
    .every((descriptor) => Object.hasOwn(descriptor, "value") && !descriptor.get && !descriptor.set);
}

function exactKeys(value, keys) {
  return plainRecord(value) && Object.keys(value).sort().join(",") === keys;
}

function shortString(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 128;
}

function isoInstant(value) {
  // Exact Date#toISOString form only; impossible calendar dates do not round-trip.
  try {
    return typeof value === "string" && new Date(value).toISOString() === value;
  } catch {
    return false;
  }
}

function localOrigin(value) {
  const match = typeof value === "string" ? LOCAL_ORIGIN.exec(value) : null;
  return Boolean(match) && Number(match[1]) <= 65535;
}

function inspectionIdentity(inspection) {
  const identity = plainRecord(inspection) ? inspection.identity : null;
  if (!plainRecord(identity)) return null;
  const fields = ["buildId", "sourceInventorySha256", "dependencySha256", "artifactFullSha256", "artifactScopeSha256"];
  if (!fields.every((field) => typeof identity[field] === "string" && identity[field].length > 0)) return null;
  return Object.fromEntries(fields.map((field) => [field, identity[field]]));
}

function recordIdentity(expectedInputs) {
  return {
    buildId: expectedInputs?.buildId,
    sourceInventorySha256: expectedInputs?.sourceInventorySha256,
    dependencySha256: expectedInputs?.dependencySha256,
    artifactFullSha256: expectedInputs?.artifactFull?.canonicalSha256,
    artifactScopeSha256: expectedInputs?.artifactScope?.canonicalSha256,
  };
}

function manifestRows(expectedInputs) {
  const rows = Array.isArray(expectedInputs?.artifactFull?.rows) ? expectedInputs.artifactFull.rows : [];
  return new Map(rows.map((row) => [row?.path, row?.sha256]));
}

/** Chunks a browser may fetch or evaluate at startup per the adapter graph: HTML script/preload roots,
 * Flight preloads and their static imports. Deferred explicit chunk loads are excluded by design.
 * Edge cases, both fail closed: an artifact file over the per-file limit stops the adapter before a graph exists,
 * so markers elsewhere report BLOCKED rather than FAIL; Flight data inside a chunk that only loads later is still
 * treated as startup, which can report a false FAIL. */
export function startupReachableChunks(inspection) {
  const edges = Array.isArray(inspection?.graph?.edges) ? inspection.graph.edges : [];
  const chunk = (value) => typeof value === "string" && value.startsWith("static/chunks/") && value.endsWith(".js");
  const reachable = new Set();
  for (const edge of edges) {
    if ((edge?.kind === "synchronous-instantiation" && typeof edge.from === "string" && edge.from.startsWith("route:")
      && ["SCRIPT_ROOT", "PRELOAD_DECLARATION"].includes(edge.condition)) || edge?.kind === "flight-resolve-preload") {
      if (chunk(edge.to)) reachable.add(edge.to);
    }
  }
  let grew = true;
  while (grew) {
    grew = false;
    for (const edge of edges) {
      if (edge?.kind === "synchronous-instantiation" && edge.condition === undefined && chunk(edge.to)
        && (reachable.has(edge.from) || (typeof edge.from === "string" && edge.from.startsWith("inline:")))
        && !reachable.has(edge.to)) {
        reachable.add(edge.to);
        grew = true;
      }
    }
  }
  return [...reachable].sort();
}

function checkLegacyInspection(legacy, expectedInputs, reasons) {
  const evidence = plainRecord(legacy) ? legacy.evidence : null;
  if (!plainRecord(legacy) || legacy.schemaVersion !== 1 || legacy.scope !== SCOPE || legacy.releaseDecision !== "BLOCKED"
    || !plainRecord(evidence) || !Array.isArray(evidence.diagnostics) || !Array.isArray(evidence.inputManifest?.files)) {
    reasons.add("INVALID_LEGACY_INSPECTION");
    return false;
  }
  let failed = false;
  for (const item of evidence.diagnostics) {
    if (item?.code === "FORBIDDEN_INITIAL_MARKER") {
      failed = true;
      reasons.add("FORBIDDEN_INITIAL_MARKER");
    } else if (!Object.hasOwn(LEGACY_CLOSURE, item?.code)) {
      reasons.add("LEGACY_INSPECTION_INCOMPLETE");
    }
  }
  // Both inspections must describe the same admitted bytes, not two different reads of a changing directory.
  if (expectedInputs) {
    const rows = manifestRows(expectedInputs);
    for (const file of evidence.inputManifest.files) {
      const path = typeof file?.path === "string" && file.path.startsWith("/_next/") ? file.path.slice(7) : file?.path;
      if (!rows.has(path) || rows.get(path) !== file?.sha256) {
        reasons.add("LEGACY_INSPECTION_IDENTITY_MISMATCH");
        break;
      }
    }
  }
  return failed;
}

function checkStartupScan(scan, inspection, expectedInputs, attested, reasons) {
  const expected = startupReachableChunks(inspection);
  if (!Array.isArray(scan) || scan.length !== expected.length) {
    reasons.add("STARTUP_SCAN_INCOMPLETE");
    return false;
  }
  const rows = manifestRows(expectedInputs);
  let failed = false;
  for (let index = 0; index < expected.length; index += 1) {
    const item = scan[index];
    if (!exactKeys(item, "markers,path,sha256") || item.path !== expected[index] || !Array.isArray(item.markers)) {
      reasons.add("STARTUP_SCAN_INCOMPLETE");
      continue;
    }
    if (rows.get(item.path) !== item.sha256) {
      reasons.add("STARTUP_SCAN_IDENTITY_MISMATCH");
      continue;
    }
    if (item.markers.length > 0) {
      failed = true;
      reasons.add("FORBIDDEN_STARTUP_MARKER");
    }
  }
  // Marker strings are supplemental evidence only; the admitted record must name the exact startup chunk bytes
  // that QA and reviewers examined, so renamed or encoded code cannot enter the startup set unreviewed.
  const scanned = JSON.stringify(scan.map((item) => ({ path: item?.path, sha256: item?.sha256 })));
  if (!Array.isArray(attested) || JSON.stringify(attested) !== scanned) reasons.add("STARTUP_CHUNKS_NOT_ATTESTED");
  return failed;
}

function checkTimingEvidence(timing, identity, reasons) {
  if (!exactKeys(timing, TIMING_KEYS) || timing.schemaVersion !== 1 || timing.policyVersion !== SUPPORTED_PROFILE.policyVersion
    || !exactKeys(timing.browser, "name,version") || !shortString(timing.browser.name) || !shortString(timing.browser.version)
    || !exactKeys(timing.collectedAt, "end,start") || !isoInstant(timing.collectedAt.start) || !isoInstant(timing.collectedAt.end)
    || Date.parse(timing.collectedAt.end) < Date.parse(timing.collectedAt.start)
    || !localOrigin(timing.localOrigin)
    || !HEX_64.test(timing.evidenceBundleSha256) || !Array.isArray(timing.scenarios)) {
    reasons.add("INVALID_TIMING_EVIDENCE");
    return false;
  }
  if (!identity || timing.buildId !== identity.buildId || timing.artifactScopeSha256 !== identity.artifactScopeSha256
    || timing.artifactFullSha256 !== identity.artifactFullSha256) {
    reasons.add("TIMING_EVIDENCE_IDENTITY_MISMATCH");
  }
  const seen = new Set();
  let failed = false;
  for (const scenario of timing.scenarios) {
    const required = TIMING_SCENARIO_ROUTES[scenario?.id];
    if (!exactKeys(scenario, SCENARIO_KEYS) || !Object.hasOwn(TIMING_SCENARIO_ROUTES, scenario.id) || seen.has(scenario.id)
      || !Array.isArray(scenario.routes) || !HEX_64.test(scenario.observationsSha256)
      || JSON.stringify([...scenario.routes].sort()) !== JSON.stringify(required)
      || scenario.state !== (scenario.id === "WARM_REPETITION" ? "warm" : "cold")) {
      reasons.add("TIMING_EVIDENCE_INCOMPLETE");
      continue;
    }
    seen.add(scenario.id);
    if (!identity || scenario.preIdentitySha256 !== identity.artifactFullSha256
      || scenario.postIdentitySha256 !== identity.artifactFullSha256) {
      reasons.add("TIMING_EVIDENCE_IDENTITY_MISMATCH");
    }
    if (scenario.status === "FAIL") {
      failed = true;
      reasons.add("TIMING_POLICY_VIOLATION");
    } else if (scenario.status !== "PASS") {
      reasons.add("TIMING_EVIDENCE_INCOMPLETE");
    }
  }
  if (seen.size !== REQUIRED_TIMING_SCENARIOS.length) reasons.add("TIMING_EVIDENCE_INCOMPLETE");
  return failed;
}

function checkReviews(reviews, gateRevision, reasons) {
  const accepted = new Set();
  const reviewedRevision = sha256(JSON.stringify(gateRevision));
  if (!Array.isArray(reviews)) {
    reasons.add("REVIEW_NOT_ACCEPTED");
    return;
  }
  for (const review of reviews) {
    if (!exactKeys(review, REVIEW_KEYS) || !REQUIRED_REVIEW_ROLES.includes(review.role) || review.disposition !== "ACCEPT"
      || !HEX_64.test(review.reportSha256) || review.reviewedGateRevisionSha256 !== reviewedRevision || accepted.has(review.role)) {
      reasons.add("REVIEW_NOT_ACCEPTED");
      continue;
    }
    accepted.add(review.role);
  }
  if (accepted.size !== REQUIRED_REVIEW_ROLES.length) reasons.add("REVIEW_NOT_ACCEPTED");
}

function decision(status, reasons, identity) {
  return {
    status,
    reasonCodes: [...reasons].sort(),
    identity: status === BUNDLE_DECISION.PASS ? identity : null,
    policyVersion: SUPPORTED_PROFILE.policyVersion,
  };
}

/**
 * Pure bundle-scope decision over evidence already collected by the trusted verifier. Never reads files,
 * executes code or loads URLs. A proven violation is FAIL even when admission or other evidence is missing.
 * PASS_BUNDLE_SCOPE covers this bundle policy only, never deployment.
 */
export function evaluateBundleBoundary(input) {
  const reasons = new Set();
  let identity = null;
  let failed = false;
  try {
    if (!exactKeys(input, DECISION_INPUT_KEYS)) {
      reasons.add("INVALID_DECISION_INPUT");
      return decision(BUNDLE_DECISION.BLOCKED, reasons, null);
    }
    const { acceptanceBytes, gateRevision, inspection, legacyInspection, origin, startupScan } = input;
    identity = inspectionIdentity(inspection);
    const inspectionShaped = plainRecord(inspection) && inspection.schemaVersion === 1 && inspection.releaseDecision === "BLOCKED"
      && inspection.policyVersion === SUPPORTED_PROFILE.policyVersion && inspection.profileId === SUPPORTED_PROFILE.profileId;
    if (!inspectionShaped) {
      reasons.add("INVALID_ADAPTER_INSPECTION");
    } else if (inspection.staticStatus === "STATIC_VIOLATION") {
      failed = true;
      reasons.add("ADAPTER_STATIC_VIOLATION");
    } else if (inspection.staticStatus !== "STATIC_SUPPORTED") {
      reasons.add("ADAPTER_STATIC_UNKNOWN");
    }
    if (inspectionShaped && !identity) reasons.add("INCOMPLETE_ARTIFACT_IDENTITY");

    let record = null;
    if (!(acceptanceBytes instanceof Uint8Array)) {
      reasons.add("MISSING_ACCEPTANCE_RECORD");
    } else if (acceptanceBytes.length > ACCEPTANCE_BYTES_LIMIT) {
      reasons.add("ACCEPTANCE_RESOURCE_LIMIT");
    } else if (!isAdmitted(sha256(acceptanceBytes))) {
      reasons.add("ACCEPTANCE_NOT_ADMITTED");
    } else {
      try {
        const text = new TextDecoder("utf-8", { fatal: true }).decode(acceptanceBytes);
        const parsed = JSON.parse(text);
        // Canonical compact JSON only: duplicate keys or alternate spellings cannot hide a field.
        if (JSON.stringify(parsed) === text) record = parsed;
      } catch {
        record = null;
      }
      if (!exactKeys(record, RECORD_KEYS) || record.schemaVersion !== 1 || record.policyVersion !== SUPPORTED_PROFILE.policyVersion
        || record.profileId !== SUPPORTED_PROFILE.profileId || !plainRecord(record.expectedInputs)) {
        reasons.add("INVALID_ACCEPTANCE_RECORD");
        record = null;
      }
    }

    // Legacy markers need no record: a proven marker is FAIL regardless of admission state.
    if (checkLegacyInspection(legacyInspection, record?.expectedInputs ?? null, reasons)) failed = true;

    if (record) {
      const expected = recordIdentity(record.expectedInputs);
      if (!identity || Object.keys(expected).some((field) => expected[field] !== identity[field])) {
        reasons.add("ACCEPTANCE_IDENTITY_MISMATCH");
      }
      if (typeof origin !== "string" || record.productionOrigin !== origin) reasons.add("ORIGIN_NOT_BOUND");
      if (!exactKeys(gateRevision, GATE_REVISION_KEYS) || !exactKeys(record.gateRevision, GATE_REVISION_KEYS)
        || !Object.keys(gateRevision).every((key) => HEX_64.test(gateRevision[key]) && record.gateRevision[key] === gateRevision[key])) {
        reasons.add("GATE_REVISION_MISMATCH");
      }
      // Runs for any well-formed inspection: an unknown elsewhere in the graph must not hide an eager marker.
      if (inspectionShaped && checkStartupScan(startupScan, inspection, record.expectedInputs, record.startupChunks, reasons)) {
        failed = true;
      }
      if (checkTimingEvidence(record.timingEvidence, identity, reasons)) failed = true;
      checkReviews(record.reviews, gateRevision, reasons);
    }
  } catch {
    reasons.add("INVALID_DECISION_INPUT");
  }
  const status = failed ? BUNDLE_DECISION.FAIL : reasons.size ? BUNDLE_DECISION.BLOCKED : BUNDLE_DECISION.PASS;
  return decision(status, reasons, identity);
}

async function readBoundFile(path, limit) {
  let handle;
  try {
    handle = await open(path, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW || 0));
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || before.size > BigInt(limit) || await realpath(path) !== path) return null;
    const bytes = Buffer.alloc(Number(before.size));
    let offset = 0;
    while (offset < bytes.length) {
      const { bytesRead } = await handle.read(bytes, offset, bytes.length - offset, offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    const after = await handle.stat({ bigint: true });
    return offset === bytes.length && fileIdentity(before) === fileIdentity(after) ? bytes : null;
  } catch {
    return null;
  } finally {
    await handle?.close().catch(() => {});
  }
}

/** Code revision the acceptance record and reviews bind to: every module on the verify-existing decision path. */
export async function readGateRevision() {
  const text = async (name) => readFile(fileURLToPath(new URL(name, VERIFIER_URL)), "utf8");
  const verifier = await readFile(fileURLToPath(VERIFIER_URL), "utf8");
  const declarations = verifier.match(ADMISSION_DECLARATION) || [];
  const statements = verifier.match(ADMISSION_STATEMENT) || [];
  const listed = declarations.length === 1 ? [...declarations[0].matchAll(/"([a-f0-9]{64})"/g)].map((match) => match[1]) : [];
  // The running list must be exactly the data parsed from the hashed source text.
  if (declarations.length !== 1 || statements.length !== 1
    || JSON.stringify([...listed].sort()) !== JSON.stringify([...ADMITTED_ACCEPTANCE_SHA256].sort())) {
    throw new BundleBoundaryError("NQR_BUNDLE_NEEDS_EMISSION_REVIEW", ["UNREADABLE_GATE_REVISION"]);
  }
  return {
    adapterSha256: sha256(await text("./inspect-turbopack-emission.mjs")),
    buildWrapperSha256: sha256(await text("./build.mjs")),
    originArtifactsSha256: sha256(await text("./verify-origin-artifacts.mjs")),
    originGateSha256: sha256(await text("./origin-gate.mjs")),
    verifierLogicSha256: sha256(verifier.replace(ADMISSION_DECLARATION, EMPTY_ADMISSION_DECLARATION)),
  };
}

async function scanStartupChunks(artifactRoot, inspection) {
  const scan = [];
  for (const path of startupReachableChunks(inspection)) {
    const bytes = await readBoundFile(join(artifactRoot, path), INSPECTION_LIMITS.bytesPerFile);
    if (!bytes) return null;
    scan.push({
      markers: FORBIDDEN_INITIAL_MARKERS.filter((marker) => bytes.includes(Buffer.from(marker))),
      path,
      sha256: sha256(bytes),
    });
  }
  return scan;
}

async function decideExistingArtifact(buildDir, options) {
  const blocked = (codes) => decision(BUNDLE_DECISION.BLOCKED, new Set(codes), null);
  let acceptancePath;
  let origin;
  try {
    if (!exactKeys(options, "acceptancePath,origin")) return blocked(["INVALID_VERIFY_OPTIONS"]);
    ({ acceptancePath, origin } = options);
  } catch {
    return blocked(["INVALID_VERIFY_OPTIONS"]);
  }
  if (typeof buildDir !== "string" || !isAbsolute(buildDir) || typeof acceptancePath !== "string"
    || !isAbsolute(acceptancePath) || typeof origin !== "string") return blocked(["INVALID_VERIFY_OPTIONS"]);
  const artifactRoot = resolve(buildDir);
  // The legacy closed inspector needs no evidence, so its proven markers are reported even without admission.
  const legacyInspection = await inspectInitialBundleBoundary(artifactRoot);
  const legacyOnly = (codes) => {
    const reasons = new Set(codes);
    const failed = checkLegacyInspection(legacyInspection, null, reasons);
    return decision(failed ? BUNDLE_DECISION.FAIL : BUNDLE_DECISION.BLOCKED, reasons, null);
  };
  const acceptanceBytes = await readBoundFile(acceptancePath, ACCEPTANCE_BYTES_LIMIT);
  if (!acceptanceBytes) return legacyOnly(["UNREADABLE_ACCEPTANCE_RECORD"]);
  // Unadmitted bytes are never parsed or used to steer inspection.
  if (!isAdmitted(sha256(acceptanceBytes))) return legacyOnly(["ACCEPTANCE_NOT_ADMITTED"]);
  let expectedInputs;
  try {
    expectedInputs = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(acceptanceBytes)).expectedInputs;
  } catch {
    return legacyOnly(["INVALID_ACCEPTANCE_RECORD"]);
  }
  const inspection = await inspectTurbopackEmission({ artifactRoot, expectedInputs, profile: SUPPORTED_PROFILE });
  const startupScan = await scanStartupChunks(artifactRoot, inspection);
  let gateRevision;
  try {
    gateRevision = await readGateRevision();
  } catch {
    return legacyOnly(["UNREADABLE_GATE_REVISION"]);
  }
  return evaluateBundleBoundary({ acceptanceBytes, gateRevision, inspection, legacyInspection, origin, startupScan });
}

/**
 * Without options this remains the always-blocking closed inspector. With explicit options it resolves only for
 * PASS_BUNDLE_SCOPE on an existing artifact and an admitted acceptance record; it never builds or runs Next.
 * Rejections carry fixed reason codes only.
 */
export async function verifyInitialBundleBoundary(buildDir = ".next", options) {
  if (options === undefined) {
    const result = await inspectInitialBundleBoundary(buildDir);
    if (result.evidence.diagnostics.some(({ code }) => code === "FORBIDDEN_INITIAL_MARKER")) {
      throw new BundleBoundaryError("NQR_BUNDLE_STATIC_CHECK_FAILED");
    }
    throw new BundleBoundaryError("NQR_BUNDLE_NEEDS_EMISSION_REVIEW");
  }
  const result = await decideExistingArtifact(buildDir, options);
  if (result.status === BUNDLE_DECISION.PASS) return result;
  throw new BundleBoundaryError(result.status === BUNDLE_DECISION.FAIL
    ? "NQR_BUNDLE_STATIC_CHECK_FAILED" : "NQR_BUNDLE_NEEDS_EMISSION_REVIEW", result.reasonCodes);
}
