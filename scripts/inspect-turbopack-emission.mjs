import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { open, lstat, opendir, readlink, realpath } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseHtml } from "parse5";

const require = createRequire(import.meta.url);
const acorn = require("next/dist/compiled/acorn/acorn");

export const STATIC_SUPPORTED = "STATIC_SUPPORTED";
export const STATIC_VIOLATION = "STATIC_VIOLATION";
export const STATIC_UNKNOWN = "STATIC_UNKNOWN";

export const EDGE_KINDS = Object.freeze([
  "registration",
  "synchronous-instantiation",
  "deferred-thunk-creation",
  "deferred-invocation",
  "flight-resolve-preload",
  "explicit-chunk-load",
  "alias",
  "unknown",
]);

const ROUTE_TYPES = Object.freeze([
  "url", "text", "wifi", "vcard", "email", "sms", "tel", "geo", "event", "promptpay",
]);
const ROUTES = Object.freeze(["th", "en"].flatMap((locale) => [
  `/${locale}`,
  ...ROUTE_TYPES.map((type) => `/${locale}/qr/${type}`),
]));

export const SUPPORTED_PROFILE = Object.freeze({
  schemaVersion: 1,
  policyVersion: "NQR_PREVIEW_PDF_STARTUP_V1",
  profileId: "NEXT_16_3_1_TURBOPACK_BROWSER_V1",
  nextVersion: "16.3.1",
  nextPackageSha256: "dc243091ba95352bbc300be22c6561d24a19a1c0bd2c2cc85d2c5168767ea7b9",
  parserSha256: "758cead0e9764f94320f938ac169fb95c7eeea30dc675a6e5b1133fae239fa19",
  htmlParserVersion: "8.0.1",
  htmlParserPackageSha256: "159187fd5c0c0c17456282f4cf7beab91eb46dfc717928522938c947007282b7",
  htmlParserEntrySha256: "b825162aced2e79be8d68d45efb1f89ec34ed4189467195a071a0d7b694a19d4",
  htmlEntitiesPackageSha256: "86e28ac6361377a9c0a82dc7ce849b16bfcc6b13d862c563bbf9b3fe9267773a",
  htmlEntitiesEntrySha256: "442e6496aca70e865e6e9f295a71794e1889d247031e77ea1c58c415d172485b",
  sourceInventorySha256: "3b0c6a72c34acdf89f4526ffecc0c3083f08befd1916c86f1f670cb2519b00df",
  dependencySha256: "82b9649f810f12f6e82a9c17213fa0f221775f50b577217bbd5eeb8d600906db",
  polyfillNomoduleSha256: "0973c1d64c88adc8e3c950410cb58b288f72118d5965b78049438deb8f2f9683",
  routes: ROUTES,
  limits: Object.freeze({
    htmlFiles: 22,
    entriesPerRoute: 512,
    jsFiles: 256,
    bytesPerExecutableFile: 8 * 1024 * 1024,
    executableBytes: 64 * 1024 * 1024,
    identityFiles: 1024,
    identityNodes: 2048,
    identityDepth: 64,
    identityBytes: 512 * 1024 * 1024,
    graphEdges: 4096,
    diagnostics: 1024,
    flightRecordsPerRoute: 2048,
    flightBytesPerRoute: 2 * 1024 * 1024,
    htmlNodesPerRoute: 16384,
    descriptorBytes: 64 * 1024,
    manifestBytes: 4 * 1024 * 1024,
  }),
});

const HEX_64 = /^[a-f0-9]{64}$/;
const BUILD_ID = /^[A-Za-z0-9_-]{1,128}$/;
const SEGMENT = /^[A-Za-z0-9_.@+$~\-\[\]()]+$/;
const CHUNK_PREFIX = "static/chunks/";
const HTML_PREFIX = "server/app/";
const ALLOWED_SCRIPT_TYPES = new Set(["", "text/javascript", "application/javascript", "module"]);
const INERT_SCRIPT_TYPES = new Set(["application/json", "application/ld+json"]);
const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
const NESTED_CONTEXT_TAGS = new Set(["iframe", "frame", "frameset", "object", "embed", "portal", "fencedframe"]);
// React Flight folds row IDs as 32-bit hex nibbles, so leading zeros and long IDs alias shorter ones.
const FLIGHT_ROW_ID = /^(?:0|[1-9a-f][0-9a-f]{0,6})$/;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function ascii(a, b) {
  return Buffer.from(a).compare(Buffer.from(b));
}

function inside(root, candidate) {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

function safeRelative(value) {
  return typeof value === "string" && value.length > 0 && !isAbsolute(value) && !value.includes("\\")
    && value.split("/").every((part) => part && part !== "." && part !== ".." && SEGMENT.test(part));
}

function stableIdentity(stat) {
  return [stat.dev, stat.ino, stat.size, stat.mtimeNs, stat.ctimeNs].map(String).join(":");
}

function fixedDiagnostic(code, severity, subject = "inspection", span) {
  return {
    code,
    severity,
    subject: safeRelative(subject) || subject.startsWith("route:") || subject.startsWith("inline:")
      ? subject.slice(0, 256)
      : "inspection",
    ...(span && Number.isSafeInteger(span.start) && Number.isSafeInteger(span.end)
      ? { span: { start: span.start, end: span.end } }
      : {}),
  };
}

function createState() {
  return {
    diagnostics: [],
    edges: [],
    nodes: [],
    executableBytes: 0,
    registrations: new Map(),
    registrationSubjects: new Map(),
    moduleRequirements: [],
    routeRootChunks: new Map(),
    flightRecords: new Map(),
    flightUsage: new Map(),
    diagnosticOverflow: false,
    diagnosticCounts: { UNKNOWN: 0, VIOLATION: 0 },
    sawUnknown: false,
    sawViolation: false,
    violationRepresentative: null,
  };
}

function chargeExecutableBytes(state, size, subject) {
  state.executableBytes += size;
  const accepted = state.executableBytes <= SUPPORTED_PROFILE.limits.executableBytes;
  if (!accepted) addDiagnostic(state, "RESOURCE_LIMIT", "UNKNOWN", subject);
  return accepted;
}

function addDiagnostic(state, code, severity, subject, span) {
  const diagnostic = fixedDiagnostic(code, severity, subject, span);
  if (severity === "VIOLATION") state.sawViolation = true;
  else state.sawUnknown = true;
  if (severity === "VIOLATION" && !state.violationRepresentative) state.violationRepresentative = diagnostic;
  state.diagnosticCounts[severity] = (state.diagnosticCounts[severity] || 0) + 1;
  if (state.diagnostics.length < SUPPORTED_PROFILE.limits.diagnostics - 1) {
    state.diagnostics.push(diagnostic);
  } else {
    state.diagnosticOverflow = true;
  }
}

function addEdge(state, edge) {
  if (state.edges.length >= SUPPORTED_PROFILE.limits.graphEdges) {
    addDiagnostic(state, "GRAPH_RESOURCE_LIMIT", "UNKNOWN", "graph");
    return;
  }
  state.edges.push(edge);
}

function addNode(state, node) {
  if (state.nodes.length >= SUPPORTED_PROFILE.limits.graphEdges) {
    addDiagnostic(state, "GRAPH_NODE_RESOURCE_LIMIT", "UNKNOWN", "graph");
    return;
  }
  state.nodes.push(node);
}

async function readStableFile(path, byteLimit, state, subject, fileIdentities = null) {
  let handle;
  try {
    handle = await open(path, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW || 0));
    const before = await handle.stat({ bigint: true });
    const pathStat = await lstat(path, { bigint: true });
    if (!before.isFile()) throw new Error("NON_REGULAR");
    if (!pathStat.isFile() || stableIdentity(before) !== stableIdentity(pathStat)) throw new Error("PATH_IDENTITY");
    if (before.size > BigInt(byteLimit)) throw new Error("FILE_LIMIT");
    const bytes = Buffer.alloc(Number(before.size));
    let offset = 0;
    while (offset < bytes.length) {
      const { bytesRead } = await handle.read(bytes, offset, bytes.length - offset, offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    const after = await handle.stat({ bigint: true });
    if (offset !== bytes.length || stableIdentity(before) !== stableIdentity(after)) throw new Error("READ_RACE");
    if (fileIdentities) {
      // Artifact leaves must still resolve to the opened inode without a substituted ancestor after the read.
      if (await realpath(path) !== path) throw new Error("PATH_IDENTITY");
      const afterPath = await lstat(path, { bigint: true });
      if (!afterPath.isFile() || stableIdentity(after) !== stableIdentity(afterPath)) throw new Error("PATH_IDENTITY");
      fileIdentities.set(subject, `${before.dev}:${before.ino}`);
    }
    return bytes;
  } catch (error) {
    const code = error?.message === "FILE_LIMIT"
      ? "RESOURCE_LIMIT"
      : error?.message === "PATH_IDENTITY" ? "ARTIFACT_PATH_IDENTITY_MISMATCH"
      : error?.message === "READ_RACE" ? "CHANGED_INPUT_DURING_READ" : "UNREADABLE_REQUIRED_FILE";
    addDiagnostic(state, code, "UNKNOWN", subject);
    return null;
  } finally {
    await handle?.close().catch(() => {});
  }
}

async function walkFiles(root, state, retainSemantic = true) {
  const rows = [];
  const semanticBuffers = new Map();
  const fileIdentities = new Map();
  let totalBytes = 0;
  let visitedNodes = 0;
  let stopped = false;
  const directoryAnchors = new Map();
  async function validateDirectory(directory, relativeDirectory, expected) {
    try {
      const stat = await lstat(directory, { bigint: true });
      const physical = await realpath(directory);
      const identity = `${stat.dev}:${stat.ino}`;
      if (!stat.isDirectory() || stat.isSymbolicLink() || physical !== resolve(directory)
        || (expected && expected !== identity)) throw new Error("DIRECTORY_IDENTITY");
      directoryAnchors.set(relativeDirectory, identity);
      return identity;
    } catch {
      addDiagnostic(state, "ARTIFACT_DIRECTORY_IDENTITY_MISMATCH", "UNKNOWN",
        relativeDirectory || "artifact");
      return null;
    }
  }
  async function visit(directory, relativeDirectory = "", depth = 0) {
    if (stopped) return;
    if (depth > SUPPORTED_PROFILE.limits.identityDepth) {
      addDiagnostic(state, "IDENTITY_DEPTH_LIMIT", "UNKNOWN", "artifact");
      stopped = true;
      return;
    }
    const names = [];
    let handle;
    const anchor = await validateDirectory(directory, relativeDirectory, directoryAnchors.get(relativeDirectory));
    if (!anchor) return;
    try {
      handle = await opendir(directory);
      if (!await validateDirectory(directory, relativeDirectory, anchor)) {
        await handle.close().catch(() => {});
        return;
      }
      for await (const entry of handle) {
        visitedNodes += 1;
        if (visitedNodes > SUPPORTED_PROFILE.limits.identityNodes) {
          addDiagnostic(state, "IDENTITY_NODE_LIMIT", "UNKNOWN", "artifact");
          stopped = true;
          break;
        }
        names.push(entry.name);
      }
    } catch {
      addDiagnostic(state, "UNREADABLE_ARTIFACT_ROOT", "UNKNOWN", "artifact");
      return;
    }
    if (!await validateDirectory(directory, relativeDirectory, anchor)) return;
    if (stopped) return;
    names.sort(ascii);
    for (const name of names) {
      if (stopped) return;
      const path = join(directory, name);
      const itemPath = relativeDirectory ? `${relativeDirectory}/${name}` : name;
      let stat;
      try {
        stat = await lstat(path);
      } catch {
        addDiagnostic(state, "CHANGED_INPUT_DURING_WALK", "UNKNOWN", itemPath);
        continue;
      }
      if (stat.isDirectory()) {
        await visit(path, itemPath, depth + 1);
      } else if (stat.isSymbolicLink()) {
        const target = await readlink(path).catch(() => "");
        rows.push({ path: itemPath, type: "symlink", target });
      } else if (stat.isFile()) {
        totalBytes += stat.size;
        if (rows.length >= SUPPORTED_PROFILE.limits.identityFiles || totalBytes > SUPPORTED_PROFILE.limits.identityBytes) {
          addDiagnostic(state, "IDENTITY_RESOURCE_LIMIT", "UNKNOWN", "artifact");
          stopped = true;
          return;
        }
        const bytes = await readStableFile(path, SUPPORTED_PROFILE.limits.identityBytes, state, itemPath, fileIdentities);
        if (bytes) {
          rows.push({ sha256: sha256(bytes), path: itemPath, size: bytes.length, type: "file" });
          const executable = (itemPath.startsWith(HTML_PREFIX) && itemPath.endsWith(".html"))
            || (itemPath.startsWith(CHUNK_PREFIX) && itemPath.endsWith(".js"));
          if (retainSemantic && (itemPath === "BUILD_ID" || executable)) {
            if (bytes.length > SUPPORTED_PROFILE.limits.bytesPerExecutableFile) {
              addDiagnostic(state, "RESOURCE_LIMIT", "UNKNOWN", itemPath);
            } else if (!executable || chargeExecutableBytes(state, bytes.length, itemPath)) {
              semanticBuffers.set(itemPath, bytes);
            }
          }
        }
      } else {
        rows.push({ path: itemPath, size: stat.size, type: "unsupported" });
      }
    }
  }
  await visit(root);
  return { rows, semanticBuffers, fileIdentities, stopped };
}

function manifestShape(manifest, label, state) {
  if (!manifest || !Array.isArray(manifest.rows) || !Number.isSafeInteger(manifest.count)
    || !HEX_64.test(manifest.canonicalSha256 || "") || manifest.count !== manifest.rows.length
    || manifest.rows.length > SUPPORTED_PROFILE.limits.identityFiles) {
    addDiagnostic(state, "INVALID_EXPECTED_MANIFEST", "UNKNOWN", label);
    return null;
  }
  const seen = new Set();
  for (const row of manifest.rows) {
    if (!row || !safeRelative(row.path) || seen.has(row.path) || row.type !== "file"
      || !Number.isSafeInteger(row.size) || row.size < 0 || !HEX_64.test(row.sha256 || "")) {
      addDiagnostic(state, "INVALID_EXPECTED_MANIFEST_ROW", "UNKNOWN", label);
      return null;
    }
    seen.add(row.path);
  }
  if (sha256(JSON.stringify(manifest.rows)) !== manifest.canonicalSha256) {
    addDiagnostic(state, "EXPECTED_MANIFEST_DIGEST_MISMATCH", "UNKNOWN", label);
    return null;
  }
  return manifest.rows;
}

function rowsEqualByPath(actualRows, expectedRows, label, state) {
  const actual = new Map(actualRows.map((row) => [row.path, row]));
  const expected = new Map(expectedRows.map((row) => [row.path, row]));
  if (actual.size !== expected.size) addDiagnostic(state, "ARTIFACT_PATH_SET_MISMATCH", "UNKNOWN", label);
  for (const [path, expectedRow] of expected) {
    const actualRow = actual.get(path);
    if (!actualRow || actualRow.type !== "file" || actualRow.sha256 !== expectedRow.sha256
      || actualRow.size !== expectedRow.size) {
      addDiagnostic(state, "ARTIFACT_BYTE_IDENTITY_MISMATCH", "UNKNOWN", path);
    }
  }
  for (const path of actual.keys()) {
    if (!expected.has(path)) addDiagnostic(state, "UNEXPECTED_ARTIFACT_PATH", "UNKNOWN", path);
  }
}

function validateProfile(profile, expectedInputs, state) {
  if (!profile || profile.profileId !== SUPPORTED_PROFILE.profileId
    || profile.policyVersion !== SUPPORTED_PROFILE.policyVersion
    || profile.nextVersion !== SUPPORTED_PROFILE.nextVersion) {
    addDiagnostic(state, "UNSUPPORTED_PROFILE", "UNKNOWN", "profile");
  }
  const exactFields = [
    "nextPackageSha256", "parserSha256", "sourceInventorySha256", "dependencySha256",
    "polyfillNomoduleSha256", "htmlParserVersion", "htmlParserPackageSha256", "htmlParserEntrySha256",
    "htmlEntitiesPackageSha256", "htmlEntitiesEntrySha256",
  ];
  for (const field of exactFields) {
    if (profile?.[field] !== SUPPORTED_PROFILE[field]) addDiagnostic(state, "PROFILE_IDENTITY_MISMATCH", "UNKNOWN", `profile:${field}`);
  }
  if (JSON.stringify(profile?.routes) !== JSON.stringify(SUPPORTED_PROFILE.routes)
    || JSON.stringify(profile?.limits) !== JSON.stringify(SUPPORTED_PROFILE.limits)) {
    addDiagnostic(state, "PROFILE_CONTRACT_MISMATCH", "UNKNOWN", "profile");
  }
  if (!expectedInputs || expectedInputs.sourceInventorySha256 !== SUPPORTED_PROFILE.sourceInventorySha256
    || expectedInputs.dependencySha256 !== SUPPORTED_PROFILE.dependencySha256
    || expectedInputs.nextPackageSha256 !== SUPPORTED_PROFILE.nextPackageSha256
    || expectedInputs.parserSha256 !== SUPPORTED_PROFILE.parserSha256) {
    addDiagnostic(state, "INPUT_LINEAGE_MISMATCH", "UNKNOWN", "identity");
  }
  if (!BUILD_ID.test(expectedInputs?.buildId || "")) addDiagnostic(state, "INVALID_EXPECTED_BUILD_ID", "UNKNOWN", "BUILD_ID");
}

async function verifyLocalToolchain(state) {
  const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const files = [
    ["node_modules/next/package.json", SUPPORTED_PROFILE.nextPackageSha256, "NEXT_PACKAGE_IDENTITY_MISMATCH"],
    ["node_modules/next/dist/compiled/acorn/acorn.js", SUPPORTED_PROFILE.parserSha256, "PARSER_IDENTITY_MISMATCH"],
    ["node_modules/parse5/package.json", SUPPORTED_PROFILE.htmlParserPackageSha256, "HTML_PARSER_IDENTITY_MISMATCH"],
    ["node_modules/parse5/dist/index.js", SUPPORTED_PROFILE.htmlParserEntrySha256, "HTML_PARSER_IDENTITY_MISMATCH"],
    ["node_modules/entities/package.json", SUPPORTED_PROFILE.htmlEntitiesPackageSha256, "HTML_ENTITIES_IDENTITY_MISMATCH"],
    ["node_modules/entities/dist/index.js", SUPPORTED_PROFILE.htmlEntitiesEntrySha256, "HTML_ENTITIES_IDENTITY_MISMATCH"],
  ];
  for (const [relativePath, expected, code] of files) {
    const bytes = await readStableFile(join(projectRoot, relativePath), SUPPORTED_PROFILE.limits.identityBytes,
      state, relativePath);
    if (!bytes || sha256(bytes) !== expected) addDiagnostic(state, code, "UNKNOWN", relativePath);
  }
}

function decodeUtf8(bytes, subject, state) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    addDiagnostic(state, "INVALID_UTF8", "UNKNOWN", subject);
    return null;
  }
}

function normalizeChunkReference(raw, subject, state) {
  if (typeof raw === "string" && (raw.includes("://") || raw.startsWith("//"))) {
    addDiagnostic(state, "EXTERNAL_EXECUTABLE_REFERENCE", "VIOLATION", subject);
    return null;
  }
  if (typeof raw !== "string" || raw !== raw.trim() || raw.includes("%") || /[\\\u0000-\u001f\u007f?#]/.test(raw)) {
    addDiagnostic(state, "UNSUPPORTED_CHUNK_REFERENCE", "UNKNOWN", subject);
    return null;
  }
  const value = raw.startsWith("/_next/") ? raw.slice(7) : raw;
  if (!value.startsWith(CHUNK_PREFIX) || !value.endsWith(".js") || !safeRelative(value)) {
    addDiagnostic(state, "CHUNK_PATH_ESCAPE", "VIOLATION", subject);
    return null;
  }
  return value;
}

function extractHtmlEntries(html, route, state) {
  const entries = [];
  const parseErrors = [];
  let document;
  try {
    document = parseHtml(html, { sourceCodeLocationInfo: true, onParseError: (error) => parseErrors.push(error.code) });
  } catch {
    addDiagnostic(state, "UNSUPPORTED_HTML_PARSE", "UNKNOWN", `route:${route}`);
    return entries;
  }
  if (parseErrors.some((code) => code !== "missing-doctype")) {
    addDiagnostic(state, "HTML_PARSE_ERROR", "UNKNOWN", `route:${route}`);
  }
  let visited = 0;
  function visit(node, depth = 0, insideTemplate = false) {
    visited += 1;
    if (visited > SUPPORTED_PROFILE.limits.htmlNodesPerRoute || depth > SUPPORTED_PROFILE.limits.identityDepth) {
      addDiagnostic(state, "HTML_NODE_RESOURCE_LIMIT", "UNKNOWN", `route:${route}`);
      return false;
    }
    if (node.nodeName === "#comment") return true;
    const tag = node.tagName;
    const attrs = new Map((node.attrs || []).map((attribute) => [attribute.name.toLowerCase(), attribute.value]));
    if ([...attrs.keys()].some((name) => name.startsWith("on"))) {
      addDiagnostic(state, "UNMODELED_HTML_EVENT_HANDLER", "UNKNOWN", `route:${route}`);
    }
    if (tag === "base") addDiagnostic(state, "UNSUPPORTED_HTML_BASE", "UNKNOWN", `route:${route}`);
    if (NESTED_CONTEXT_TAGS.has(tag)) {
      addDiagnostic(state, "UNMODELED_NESTED_BROWSING_CONTEXT", "UNKNOWN", `route:${route}`);
      return true;
    }
    if (tag === "template") {
      addDiagnostic(state, "UNMODELED_TEMPLATE_CONTENT", "UNKNOWN", `route:${route}`);
      return true;
    }
    if (insideTemplate) return true;
    if (tag === "link") {
      const rel = (attrs.get("rel") || "").toLowerCase().split(/\s+/).filter(Boolean);
      const as = (attrs.get("as") || "").toLowerCase();
      if (!rel.includes("modulepreload") && !(rel.includes("preload") && as === "script")) return true;
      const href = normalizeChunkReference(attrs.get("href"), `route:${route}`, state);
      if (href) entries.push({ kind: "preload", mode: rel.includes("modulepreload") ? "module" : "classic", path: href });
    } else if (tag === "script" && node.namespaceURI !== HTML_NAMESPACE) {
      addDiagnostic(state, "UNMODELED_FOREIGN_SCRIPT", "UNKNOWN", `route:${route}`);
      return true;
    } else if (tag === "script") {
      const type = (attrs.get("type") || "").trim().toLowerCase();
      const source = (node.childNodes || []).filter((child) => child.nodeName === "#text")
        .map((child) => child.value).join("");
      if (INERT_SCRIPT_TYPES.has(type)) {
        entries.push({ kind: "inert", mode: "inert", source });
      } else if (!ALLOWED_SCRIPT_TYPES.has(type)) {
        addDiagnostic(state, "UNSUPPORTED_SCRIPT_TYPE", "UNKNOWN", `route:${route}`);
      } else {
        const mode = attrs.has("nomodule") ? "nomodule" : type === "module" ? "module" : "classic";
        if (attrs.has("src")) {
          const path = normalizeChunkReference(attrs.get("src"), `route:${route}`, state);
          if (path) entries.push({ kind: "script", mode, path });
        } else {
          entries.push({ kind: "inline", mode, source });
        }
      }
    }
    for (const child of node.childNodes || []) if (!visit(child, depth + 1, insideTemplate || tag === "template")) return false;
    if (node.content && !visit(node.content, depth + 1, true)) return false;
    return true;
  }
  visit(document);
  if (entries.length > SUPPORTED_PROFILE.limits.entriesPerRoute) {
    addDiagnostic(state, "HTML_ENTRY_RESOURCE_LIMIT", "UNKNOWN", `route:${route}`);
    return [];
  }
  return entries;
}

function member(node, objectName, property) {
  return node?.type === "MemberExpression" && !node.computed && node.object?.type === "Identifier"
    && node.object.name === objectName && node.property?.type === "Identifier" && node.property.name === property;
}

function literalInteger(node) {
  return node?.type === "Literal" && Number.isSafeInteger(node.value) && node.value >= 0;
}

function literalString(node) {
  return node?.type === "Literal" && typeof node.value === "string";
}

function functionNode(node) {
  return node?.type === "ArrowFunctionExpression" || node?.type === "FunctionExpression";
}

function expressionBody(node) {
  if (!functionNode(node)) return null;
  if (node.body.type !== "BlockStatement") return node.body;
  if (node.body.body.length === 1 && node.body.body[0].type === "ReturnStatement") return node.body.body[0].argument;
  return null;
}

function isFlightTarget(node) {
  return node?.type === "MemberExpression" && !node.computed && node.property?.type === "Identifier"
    && node.property.name === "__next_f" && node.object?.type === "Identifier" && node.object.name === "self";
}

function flightBootstrap(expression) {
  if (expression?.type !== "CallExpression" || expression.arguments.length !== 1
    || expression.callee?.type !== "MemberExpression" || expression.callee.computed
    || expression.callee.property?.name !== "push") return false;
  const receiver = expression.callee.object;
  if (receiver?.type !== "AssignmentExpression" || receiver.operator !== "=" || !isFlightTarget(receiver.left)
    || receiver.right?.type !== "LogicalExpression" || receiver.right.operator !== "||"
    || !isFlightTarget(receiver.right.left) || receiver.right.right?.type !== "ArrayExpression"
    || receiver.right.right.elements.length !== 0) return false;
  const payload = expression.arguments[0];
  return payload?.type === "ArrayExpression" && payload.elements.length === 1
    && payload.elements[0]?.type === "Literal" && payload.elements[0].value === 0;
}

function flightData(expression) {
  if (expression?.type !== "CallExpression" || expression.arguments.length !== 1
    || expression.callee?.type !== "MemberExpression" || expression.callee.computed
    || expression.callee.property?.name !== "push" || !isFlightTarget(expression.callee.object)) return null;
  const payload = expression.arguments[0];
  if (payload?.type !== "ArrayExpression" || payload.elements.length !== 2
    || payload.elements[0]?.type !== "Literal" || payload.elements[0].value !== 1
    || !literalString(payload.elements[1])) return null;
  return payload.elements[1].value;
}

function inspectFlightWire(wire, subject, route, state) {
  const records = wire.split("\n").filter(Boolean);
  const previous = state.flightUsage.get(route) || { bytes: 0, records: 0 };
  const usage = { bytes: previous.bytes + Buffer.byteLength(wire), records: previous.records + records.length };
  state.flightUsage.set(route, usage);
  if (usage.bytes > SUPPORTED_PROFILE.limits.flightBytesPerRoute) {
    addDiagnostic(state, "FLIGHT_RESOURCE_LIMIT", "UNKNOWN", subject);
    return;
  }
  if (usage.records > SUPPORTED_PROFILE.limits.flightRecordsPerRoute) {
    addDiagnostic(state, "FLIGHT_RESOURCE_LIMIT", "UNKNOWN", subject);
    return;
  }
  for (const record of records) {
    const match = /^([a-f0-9]+):I(\[.*\])$/s.exec(record);
    if (!match) {
      addDiagnostic(state, "UNSUPPORTED_FLIGHT_WIRE_RECORD", "UNKNOWN", subject);
      continue;
    }
    if (!FLIGHT_ROW_ID.test(match[1])) {
      addDiagnostic(state, "UNSUPPORTED_FLIGHT_ROW_ID", "UNKNOWN", subject);
      continue;
    }
    const rowId = String(Number.parseInt(match[1], 16));
    const routeRecords = state.flightRecords.get(route) || new Map();
    const priorRecord = routeRecords.get(rowId);
    if (priorRecord === match[2]) {
      addDiagnostic(state, "DUPLICATE_FLIGHT_RECORD_UNPROVEN", "UNKNOWN", subject);
    } else if (priorRecord != null) {
      addDiagnostic(state, "CONFLICTING_FLIGHT_RECORD_UNPROVEN", "UNKNOWN", subject);
    } else {
      routeRecords.set(rowId, match[2]);
      state.flightRecords.set(route, routeRecords);
    }
    let parsed;
    try { parsed = JSON.parse(match[2]); } catch { parsed = null; }
    if (!Array.isArray(parsed) || !literalWireModule(parsed)) {
      addDiagnostic(state, "UNSUPPORTED_FLIGHT_IMPORT_RECORD", "UNKNOWN", subject);
      continue;
    }
    const [moduleId, references] = parsed;
    addEdge(state, { kind: "synchronous-instantiation", from: subject, to: `module:${moduleId}`, condition: "FLIGHT_IMPORT" });
    const referencedChunks = [];
    for (const raw of references) {
      const path = normalizeChunkReference(raw, subject, state);
      if (path) {
        referencedChunks.push(path);
        addEdge(state, { kind: "flight-resolve-preload", from: subject, to: path, moduleId });
      }
    }
    state.moduleRequirements.push({ kind: "flight", moduleId, route, subject, chunks: referencedChunks });
  }
}

// The installed Turbopack browser client passes every metadata[1] entry to __turbopack_load_by_url__.
function literalWireModule(value) {
  return value.length === 3 && Number.isSafeInteger(value[0]) && value[0] >= 0 && Array.isArray(value[1])
    && value[1].every((chunk) => typeof chunk === "string") && typeof value[2] === "string";
}

function registrationHead(node) {
  return node?.type === "ConditionalExpression"
    && node.test?.type === "BinaryExpression"
    && ["==", "==="].includes(node.test.operator)
    && ((node.test.left?.type === "Literal" && node.test.left.value === "object" && node.test.right?.type === "UnaryExpression"
      && node.test.right.operator === "typeof" && node.test.right.argument?.name === "document")
      || (node.test.right?.type === "Literal" && node.test.right.value === "object" && node.test.left?.type === "UnaryExpression"
      && node.test.left.operator === "typeof" && node.test.left.argument?.name === "document"))
    && node.consequent?.type === "MemberExpression" && !node.consequent.computed
    && node.consequent.object?.name === "document" && node.consequent.property?.name === "currentScript"
    && node.alternate?.type === "UnaryExpression" && node.alternate.operator === "void"
    && node.alternate.argument?.type === "Literal" && node.alternate.argument.value === 0;
}

function turbopackReceiver(node) {
  if (node?.type !== "LogicalExpression" || node.operator !== "||") return false;
  const left = node.left;
  const right = node.right;
  return left?.type === "MemberExpression" && !left.computed && left.object?.name === "globalThis"
    && left.property?.name === "TURBOPACK" && right?.type === "AssignmentExpression" && right.operator === "="
    && right.left?.type === "MemberExpression" && !right.left.computed && right.left.object?.name === "globalThis"
    && right.left.property?.name === "TURBOPACK" && right.right?.type === "ArrayExpression"
    && right.right.elements.length === 0;
}

function registrationPayload(expression) {
  if (expression?.type !== "CallExpression" || expression.arguments.length !== 1
    || expression.callee?.type !== "MemberExpression" || expression.callee.computed
    || expression.callee.property?.name !== "push" || !turbopackReceiver(expression.callee.object)) return null;
  const payload = expression.arguments[0];
  if (payload?.type !== "ArrayExpression" || !registrationHead(payload.elements[0])) return null;
  if (payload.elements.length > SUPPORTED_PROFILE.limits.graphEdges) {
    return { error: "REGISTRATION_RESOURCE_LIMIT", groups: [] };
  }
  if (payload.elements.length === 2 && runtimeMetadata(payload.elements[1])) return { metadata: true, groups: [] };
  const groups = [];
  let ids = [];
  for (const element of payload.elements.slice(1)) {
    if (literalInteger(element)) {
      ids.push(element.value);
    } else if (functionNode(element) && ids.length) {
      groups.push({ ids, factory: element });
      ids = [];
    } else {
      return { error: "UNSUPPORTED_REGISTRATION_PAYLOAD", groups };
    }
  }
  if (ids.length || groups.length === 0) return { error: "UNSUPPORTED_REGISTRATION_PAYLOAD", groups };
  return { groups };
}

function runtimeMetadata(node) {
  if (node?.type !== "ObjectExpression" || node.properties.length !== 2) return false;
  const values = new Map();
  for (const property of node.properties) {
    if (property.type !== "Property" || property.computed || property.kind !== "init" || property.method
      || property.shorthand || property.key.type !== "Identifier" || property.value.type !== "ArrayExpression") return false;
    values.set(property.key.name, property.value.elements);
  }
  return values.size === 2 && values.has("otherChunks") && values.has("runtimeModuleIds")
    && values.get("otherChunks").every(literalString) && values.get("runtimeModuleIds").every(literalInteger);
}

function exactDeferredLoader(node, contextName, factoryName, subject, state, moduleIds) {
  if (node?.type !== "ArrowFunctionExpression" || node.async || node.params.length !== 1
    || node.params[0].type !== "Identifier" || node.params[0].name === contextName) return false;
  const callbackName = node.params[0].name;
  if ([contextName, factoryName, callbackName].includes("Promise")) return false;
  const body = expressionBody(node);
  if (body?.type !== "CallExpression" || body.arguments.length !== 1
    || body.callee?.type !== "MemberExpression" || body.callee.computed || body.callee.property?.name !== "then") return false;
  const promiseAll = body.callee.object;
  if (promiseAll?.type !== "CallExpression" || promiseAll.arguments.length !== 1
    || !member(promiseAll.callee, "Promise", "all")) return false;
  const mapCall = promiseAll.arguments[0];
  if (mapCall?.type !== "CallExpression" || mapCall.arguments.length !== 1
    || mapCall.callee?.type !== "MemberExpression" || mapCall.callee.computed || mapCall.callee.property?.name !== "map"
    || mapCall.callee.object?.type !== "ArrayExpression") return false;
  const chunkNodes = mapCall.callee.object.elements;
  if (!chunkNodes.length || !chunkNodes.every(literalString)) return false;
  const mapper = mapCall.arguments[0];
  if (mapper?.type !== "ArrowFunctionExpression" || mapper.async || mapper.params.length !== 1
    || mapper.params[0].type !== "Identifier" || [contextName, callbackName].includes(mapper.params[0].name)) return false;
  const mapperBody = expressionBody(mapper);
  if (mapperBody?.type !== "CallExpression" || mapperBody.arguments.length !== 1
    || !member(mapperBody.callee, contextName, "l") || mapperBody.arguments[0]?.type !== "Identifier"
    || mapperBody.arguments[0].name !== mapper.params[0].name) return false;
  const continuation = body.arguments[0];
  const continuationBody = expressionBody(continuation);
  if (continuation?.type !== "ArrowFunctionExpression" || continuation.async || continuation.params.length !== 0
    || continuationBody?.type !== "CallExpression"
    || continuationBody.callee?.type !== "Identifier" || continuationBody.callee.name !== callbackName
    || continuationBody.arguments.length !== 1 || !literalInteger(continuationBody.arguments[0])) return false;
  const targetId = continuationBody.arguments[0].value;
  const thunk = `thunk:${subject}:${moduleIds.join(",")}`;
  addEdge(state, { kind: "deferred-thunk-creation", from: subject, to: thunk, moduleIds });
  const loadedChunks = [];
  for (const chunk of chunkNodes.map((item) => item.value)) {
    const path = normalizeChunkReference(chunk, subject, state);
    if (path) {
      loadedChunks.push(path);
      addEdge(state, { kind: "explicit-chunk-load", from: thunk, to: path, condition: "DEFERRED_INVOCATION" });
    }
  }
  addEdge(state, { kind: "synchronous-instantiation", from: thunk, to: `module:${targetId}`, condition: "AFTER_CHUNK_LOAD" });
  state.moduleRequirements.push({ kind: "deferred", moduleId: targetId, subject, chunks: loadedChunks });
  return true;
}

function primitiveAst(node) {
  return node?.type === "Literal" && (node.value === null || ["string", "number", "boolean"].includes(typeof node.value));
}

function reviewedExportBindings(node) {
  if (node?.type !== "ArrayExpression" || node.elements.length === 0 || node.elements.length % 3 !== 0) return false;
  for (let index = 0; index < node.elements.length; index += 3) {
    if (!literalString(node.elements[index]) || node.elements[index + 1]?.type !== "Literal"
      || node.elements[index + 1].value !== 0 || !primitiveAst(node.elements[index + 2])) return false;
  }
  return true;
}

function inspectFactory(factory, ids, subject, state) {
  if (factory.params.length !== 1 || factory.params[0].type !== "Identifier" || factory.async || factory.generator) {
    addDiagnostic(state, "UNSUPPORTED_FACTORY_SIGNATURE", "UNKNOWN", subject, factory);
    return;
  }
  const contextName = factory.params[0].name;
  if (factory.body.type !== "BlockStatement") {
    addDiagnostic(state, "UNSUPPORTED_FACTORY_BODY", "UNKNOWN", subject, factory.body);
    return;
  }
  for (const statement of factory.body.body) {
    if (statement.type === "EmptyStatement") continue;
    if (statement.type !== "ExpressionStatement" || statement.expression.type !== "CallExpression"
      || statement.expression.callee.type !== "MemberExpression" || statement.expression.callee.computed
      || statement.expression.callee.object?.type !== "Identifier"
      || statement.expression.callee.object.name !== contextName) {
      addDiagnostic(state, "UNSUPPORTED_FACTORY_EFFECT", "UNKNOWN", subject, statement);
      addEdge(state, { kind: "unknown", from: subject, to: "unmodeled-factory-effect", span: { start: statement.start, end: statement.end } });
      continue;
    }
    const call = statement.expression;
    const method = call.callee.property.name;
    if (method === "v" && call.arguments.length === 1) {
      const value = call.arguments[0];
      if (primitiveAst(value)) continue;
      if (functionNode(value) && exactDeferredLoader(value, contextName, factory.id?.name, subject, state, ids)) continue;
      if (value.type === "CallExpression") {
        addDiagnostic(state, "UNPROVEN_FACTORY_INVOCATION", "UNKNOWN", subject, value);
        addEdge(state, { kind: "unknown", from: subject, to: "factory-invocation-effect",
          condition: "ON_MODULE_INSTANTIATION", span: { start: value.start, end: value.end } });
        continue;
      }
      addDiagnostic(state, "UNSUPPORTED_EXPORT_VALUE", "UNKNOWN", subject, value);
      continue;
    }
    if (method === "s" && call.arguments.length === 2 && reviewedExportBindings(call.arguments[0])
      && literalInteger(call.arguments[1])) {
      addEdge(state, { kind: "alias", from: subject, to: `module:${call.arguments[1].value}`, moduleIds: ids,
        condition: "ON_SOURCE_MODULE_INSTANTIATION" });
      continue;
    }
    if (["n", "j", "r", "i", "l", "A"].includes(method)) {
      addDiagnostic(state, "UNSUPPORTED_CONTEXT_OPERATION", "UNKNOWN", subject, call);
      addEdge(state, { kind: "unknown", from: subject, to: `context:${method}`, span: { start: call.start, end: call.end } });
      continue;
    }
    addDiagnostic(state, "UNSUPPORTED_CONTEXT_OPERATION", "UNKNOWN", subject, call);
  }
}

function inspectRegistration(expression, subject, source, state) {
  const payload = registrationPayload(expression);
  if (!payload) return false;
  if (payload.metadata) {
    addDiagnostic(state, "UNSUPPORTED_RUNTIME_METADATA", "UNKNOWN", subject, expression);
    return true;
  }
  if (payload.error) {
    addDiagnostic(state, payload.error, "UNKNOWN", subject, expression);
    return true;
  }
  for (const group of payload.groups) {
    const factoryText = source.slice(group.factory.start, group.factory.end);
    for (const id of group.ids) {
      const previous = state.registrations.get(id);
      if (previous && previous.factoryText !== factoryText) {
        addDiagnostic(state, "CONFLICTING_MODULE_REGISTRATION_UNPROVEN", "UNKNOWN", subject, group.factory);
      } else if (previous) {
        addDiagnostic(state, "DUPLICATE_MODULE_REGISTRATION_UNPROVEN", "UNKNOWN", subject, group.factory);
      } else {
        state.registrations.set(id, { subject, factoryText });
      }
      const subjects = state.registrationSubjects.get(id) || new Set();
      subjects.add(subject);
      state.registrationSubjects.set(id, subjects);
      addEdge(state, { kind: "registration", from: subject, to: `module:${id}` });
    }
    inspectFactory(group.factory, group.ids, subject, state);
  }
  return true;
}

function inspectJavaScript(source, subject, mode, state, route = subject) {
  let program;
  try {
    program = acorn.parse(source, { ecmaVersion: "latest", sourceType: mode === "module" ? "module" : "script" });
  } catch {
    addDiagnostic(state, "UNSUPPORTED_JAVASCRIPT_SYNTAX", "UNKNOWN", subject);
    return;
  }
  if (program.body.length > SUPPORTED_PROFILE.limits.graphEdges) {
    addDiagnostic(state, "JAVASCRIPT_NODE_RESOURCE_LIMIT", "UNKNOWN", subject);
    return;
  }
  for (const statement of program.body) {
    if (statement.type === "EmptyStatement") continue;
    if (statement.type === "ExpressionStatement") {
      if (flightBootstrap(statement.expression)) {
        addNode(state, { kind: "flight-bootstrap", subject, span: { start: statement.start, end: statement.end } });
        continue;
      }
      const wire = flightData(statement.expression);
      if (wire != null) {
        addNode(state, { kind: "flight-data", subject, span: { start: statement.start, end: statement.end } });
        inspectFlightWire(wire, subject, route, state);
        continue;
      }
      if (inspectRegistration(statement.expression, subject, source, state)) continue;
      if (primitiveAst(statement.expression)) continue;
    }
    if (mode === "module" && statement.type === "ImportDeclaration" && statement.specifiers.length === 0
      && literalString(statement.source) && !(statement.attributes?.length || statement.assertions?.length)) {
      const path = normalizeChunkReference(statement.source.value, subject, state);
      if (path) addEdge(state, { kind: "synchronous-instantiation", from: subject, to: path });
      continue;
    }
    addDiagnostic(state, "UNSUPPORTED_TOP_LEVEL_EXECUTABLE", "UNKNOWN", subject, statement);
    addEdge(state, { kind: "unknown", from: subject, to: "unmodeled-top-level", span: { start: statement.start, end: statement.end } });
  }
}

function staticStatus(state) {
  if (state.sawViolation) return STATIC_VIOLATION;
  if (state.sawUnknown) return STATIC_UNKNOWN;
  return STATIC_SUPPORTED;
}

function finalize(state, identity) {
  const sortJson = (a, b) => ascii(JSON.stringify(a), JSON.stringify(b));
  if (state.violationRepresentative && !state.diagnostics.some((item) => item.severity === "VIOLATION")) {
    if (state.diagnostics.length >= SUPPORTED_PROFILE.limits.diagnostics - 1) state.diagnostics.pop();
    state.diagnostics.push(state.violationRepresentative);
  }
  if (state.diagnosticOverflow) {
    state.diagnostics.push(fixedDiagnostic("DIAGNOSTIC_RESOURCE_LIMIT", "UNKNOWN", "diagnostics"));
  }
  state.diagnostics.sort(sortJson);
  state.edges.sort(sortJson);
  state.nodes.sort(sortJson);
  return {
    schemaVersion: 1,
    policyVersion: SUPPORTED_PROFILE.policyVersion,
    profileId: SUPPORTED_PROFILE.profileId,
    releaseDecision: "BLOCKED",
    staticStatus: staticStatus(state),
    diagnosticSummary: {
      unknownCount: state.diagnosticCounts.UNKNOWN,
      violationCount: state.diagnosticCounts.VIOLATION,
      truncated: state.diagnosticOverflow,
    },
    identity,
    graph: {
      edgeKinds: EDGE_KINDS,
      nodes: state.nodes,
      edges: state.edges,
    },
    diagnostics: state.diagnostics,
  };
}

function fixedFailure(code) {
  return {
    schemaVersion: 1,
    policyVersion: SUPPORTED_PROFILE.policyVersion,
    profileId: SUPPORTED_PROFILE.profileId,
    releaseDecision: "BLOCKED",
    staticStatus: STATIC_UNKNOWN,
    identity: null,
    graph: { edgeKinds: EDGE_KINDS, nodes: [], edges: [] },
    diagnosticSummary: { unknownCount: 1, violationCount: 0, truncated: false },
    diagnostics: [fixedDiagnostic(code, "UNKNOWN")],
  };
}

function admittedIdentity(expectedInputs) {
  const digest = (value) => typeof value === "string" && HEX_64.test(value) ? value : null;
  return {
    buildId: typeof expectedInputs?.buildId === "string" && BUILD_ID.test(expectedInputs.buildId)
      ? expectedInputs.buildId : null,
    sourceInventorySha256: digest(expectedInputs?.sourceInventorySha256),
    dependencySha256: digest(expectedInputs?.dependencySha256),
    artifactFullSha256: digest(expectedInputs?.artifactFull?.canonicalSha256),
    artifactScopeSha256: digest(expectedInputs?.artifactScope?.canonicalSha256),
  };
}

function plainDataRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  return Object.values(Object.getOwnPropertyDescriptors(value))
    .every((descriptor) => Object.hasOwn(descriptor, "value") && !descriptor.get && !descriptor.set);
}

export async function inspectTurbopackEmission(options) {
  const state = createState();
  let identity = null;
  try {
    if (!plainDataRecord(options)) return fixedFailure("INVALID_API_INPUT");
    const artifactRoot = options?.artifactRoot;
    const expectedInputs = options?.expectedInputs;
    const profile = options?.profile;
    if (!plainDataRecord(expectedInputs) || !plainDataRecord(profile)) return fixedFailure("INVALID_API_INPUT");
    identity = admittedIdentity(expectedInputs);
    validateProfile(profile, expectedInputs, state);
    await verifyLocalToolchain(state);
    if (typeof artifactRoot !== "string" || !isAbsolute(artifactRoot)) {
      addDiagnostic(state, "ARTIFACT_ROOT_MUST_BE_ABSOLUTE", "UNKNOWN", "artifact");
      return finalize(state, identity);
    }
    const lexicalRoot = resolve(artifactRoot);
    let physicalRoot;
    try { physicalRoot = await realpath(lexicalRoot); } catch { physicalRoot = null; }
    if (!physicalRoot || physicalRoot !== lexicalRoot) {
      addDiagnostic(state, "ARTIFACT_ROOT_IDENTITY_MISMATCH", "UNKNOWN", "artifact");
      return finalize(state, identity);
    }
    const rootStat = await lstat(physicalRoot);
    if (!rootStat.isDirectory()) {
      addDiagnostic(state, "ARTIFACT_ROOT_NOT_DIRECTORY", "UNKNOWN", "artifact");
      return finalize(state, identity);
    }

    const expectedFull = manifestShape(expectedInputs?.artifactFull, "artifact-full", state);
    const expectedScope = manifestShape(expectedInputs?.artifactScope, "artifact-scope", state);
    const inventory = await walkFiles(physicalRoot, state);
    const actualFull = inventory.rows;
    if (actualFull.some((row) => row.type !== "file")) {
      addDiagnostic(state, "NON_REGULAR_ARTIFACT_NODE", "UNKNOWN", "artifact");
    }
    if (expectedFull) rowsEqualByPath(actualFull, expectedFull, "artifact-full", state);
    const actualScope = actualFull.filter((row) => row.path === "BUILD_ID"
      || row.path.startsWith(`${HTML_PREFIX}`) || row.path.startsWith("static/"))
      .sort((a, b) => ascii(a.path, b.path));
    if (expectedScope) rowsEqualByPath(actualScope, expectedScope, "artifact-scope", state);
    if (!expectedFull || !expectedScope || state.diagnostics.length) return finalize(state, identity);

    const buildIdBytes = inventory.semanticBuffers.get("BUILD_ID") || null;
    const actualBuildId = buildIdBytes ? decodeUtf8(buildIdBytes, "BUILD_ID", state)?.trim() : null;
    if (actualBuildId !== expectedInputs.buildId) addDiagnostic(state, "BUILD_ID_MISMATCH", "UNKNOWN", "BUILD_ID");

    const modesByChunk = new Map();
    for (const route of SUPPORTED_PROFILE.routes) {
      const path = join(physicalRoot, HTML_PREFIX, `${route.slice(1)}.html`);
      if (!inside(physicalRoot, path)) {
        addDiagnostic(state, "HTML_PATH_ESCAPE", "VIOLATION", `route:${route}`);
        continue;
      }
      const relativePath = `${HTML_PREFIX}${route.slice(1)}.html`;
      const bytes = inventory.semanticBuffers.get(relativePath) || null;
      if (!bytes) addDiagnostic(state, "MISSING_ADMITTED_HTML_BUFFER", "UNKNOWN", `route:${route}`);
      if (!bytes) continue;
      const html = decodeUtf8(bytes, `route:${route}`, state);
      if (html == null) continue;
      const entries = extractHtmlEntries(html, route, state);
      for (let index = 0; index < entries.length; index += 1) {
        const entry = entries[index];
        const subject = `inline:${route.slice(1)}:${index}`;
        if (entry.kind === "inline") inspectJavaScript(entry.source, subject, entry.mode, state, route);
        if (entry.path) {
          const modes = modesByChunk.get(entry.path) || new Set();
          modes.add(entry.mode);
          modesByChunk.set(entry.path, modes);
          if (entry.kind === "script" && entry.mode !== "nomodule") {
            const roots = state.routeRootChunks.get(route) || new Set();
            roots.add(entry.path);
            state.routeRootChunks.set(route, roots);
          }
          addEdge(state, { kind: "synchronous-instantiation", from: `route:${route}`, to: entry.path,
            condition: entry.kind === "preload" ? "PRELOAD_DECLARATION" : "SCRIPT_ROOT" });
        }
      }
    }

    const chunkRows = actualScope.filter((row) => row.path.startsWith(CHUNK_PREFIX) && row.path.endsWith(".js"));
    if (chunkRows.length > SUPPORTED_PROFILE.limits.jsFiles) {
      addDiagnostic(state, "JAVASCRIPT_FILE_RESOURCE_LIMIT", "UNKNOWN", "static/chunks");
    } else {
      for (const row of chunkRows) {
        const bytes = inventory.semanticBuffers.get(row.path) || null;
        if (!bytes) addDiagnostic(state, "MISSING_ADMITTED_CHUNK_BUFFER", "UNKNOWN", row.path);
        if (!bytes) continue;
        const source = decodeUtf8(bytes, row.path, state);
        if (source == null) continue;
        const modes = modesByChunk.get(row.path) || new Set();
        if (modes.size > 1) addDiagnostic(state, "CONFLICTING_EXECUTION_MODE", "VIOLATION", row.path);
        const mode = modes.has("module") ? "module" : "classic";
        if (sha256(bytes) === SUPPORTED_PROFILE.polyfillNomoduleSha256) {
          if (!modes.has("nomodule")) addDiagnostic(state, "POLYFILL_MODE_MISMATCH", "VIOLATION", row.path);
          addNode(state, { kind: "reviewed-polyfill", subject: row.path, sha256: row.sha256 });
          continue;
        }
        if (row.path.startsWith("static/chunks/turbopack-")) {
          inspectJavaScript(source, row.path, mode, state);
          addDiagnostic(state, "UNSUPPORTED_RUNTIME_BACKEND_SEMANTICS", "UNKNOWN", row.path);
          continue;
        }
        inspectJavaScript(source, row.path, mode, state);
      }
    }
    const knownChunks = new Set(chunkRows.map((row) => row.path));
    for (const edge of state.edges) {
      if (["explicit-chunk-load", "flight-resolve-preload", "synchronous-instantiation"].includes(edge.kind)
        && typeof edge.to === "string" && edge.to.startsWith(CHUNK_PREFIX) && !knownChunks.has(edge.to)) {
        addDiagnostic(state, "MISSING_GRAPH_DESTINATION", "VIOLATION", edge.to);
      }
    }
    for (const requirement of state.moduleRequirements) {
      const registeredIn = state.registrationSubjects.get(requirement.moduleId) || new Set();
      const available = new Set(requirement.chunks);
      if (requirement.kind === "deferred") available.add(requirement.subject);
      if (requirement.kind === "flight") {
        for (const rootChunk of state.routeRootChunks.get(requirement.route) || []) available.add(rootChunk);
      }
      if (![...registeredIn].some((subject) => available.has(subject))) {
        addDiagnostic(state, "UNRESOLVED_MODULE_DESTINATION", "UNKNOWN", `module:${requirement.moduleId}`);
      }
    }
    const finalRoot = await realpath(lexicalRoot).catch(() => null);
    if (finalRoot !== physicalRoot || !(await lstat(physicalRoot).catch(() => null))?.isDirectory()) {
      addDiagnostic(state, "ARTIFACT_ROOT_CHANGED_DURING_INSPECTION", "UNKNOWN", "artifact");
    } else {
      const finalInventory = await walkFiles(physicalRoot, state, false);
      rowsEqualByPath(finalInventory.rows, expectedFull || [], "artifact-final", state);
      for (const [path, fileIdentity] of inventory.fileIdentities) {
        if (finalInventory.fileIdentities.get(path) !== fileIdentity) {
          addDiagnostic(state, "ARTIFACT_FILE_IDENTITY_CHANGED", "UNKNOWN", path);
        }
      }
    }
    return finalize(state, identity);
  } catch {
    addDiagnostic(state, "INVALID_API_INPUT", "UNKNOWN", "inspection");
    return finalize(state, identity);
  }
}

async function readBoundedJson(path, limit) {
  const state = createState();
  const bytes = await readStableFile(path, limit, state, "cli-input");
  if (!bytes) throw new Error("BOUNDED_READ_FAILED");
  const text = decodeUtf8(bytes, "cli-input", state);
  if (text == null) throw new Error("INVALID_UTF8");
  return JSON.parse(text);
}

export async function runCli(args, write = (value) => process.stdout.write(value)) {
  let values;
  try {
    if (!Array.isArray(args) || args.length !== 4) throw new Error("INVALID_ARGUMENTS");
    values = [args[0], args[1], args[2], args[3]];
    if (!values.every((value) => typeof value === "string")
      || values[0] !== "--artifact" || values[2] !== "--expected"
      || !isAbsolute(values[1]) || !isAbsolute(values[3])) throw new Error("INVALID_ARGUMENTS");
  } catch {
    const output = `${JSON.stringify(fixedFailure("INVALID_CLI_ARGUMENTS"), null, 2)}\n`;
    write(output);
    return 2;
  }
  let output;
  let exitCode;
  try {
    const descriptor = await readBoundedJson(values[3], SUPPORTED_PROFILE.limits.descriptorBytes);
    if (!descriptor || typeof descriptor !== "object" || Array.isArray(descriptor)
      || typeof descriptor.artifactFullManifestPath !== "string"
      || typeof descriptor.artifactScopeManifestPath !== "string"
      || !isAbsolute(descriptor.artifactFullManifestPath) || !isAbsolute(descriptor.artifactScopeManifestPath)) {
      throw new Error("INVALID_DESCRIPTOR");
    }
    const expectedInputs = {
      ...descriptor,
      artifactFull: await readBoundedJson(descriptor.artifactFullManifestPath, SUPPORTED_PROFILE.limits.manifestBytes),
      artifactScope: await readBoundedJson(descriptor.artifactScopeManifestPath, SUPPORTED_PROFILE.limits.manifestBytes),
    };
    delete expectedInputs.artifactFullManifestPath;
    delete expectedInputs.artifactScopeManifestPath;
    const result = await inspectTurbopackEmission({ artifactRoot: values[1], expectedInputs, profile: SUPPORTED_PROFILE });
    output = `${JSON.stringify(result, null, 2)}\n`;
    exitCode = 0;
  } catch {
    output = `${JSON.stringify(fixedFailure("CLI_INPUT_FAILURE"), null, 2)}\n`;
    exitCode = 2;
  }
  write(output);
  return exitCode;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await runCli(process.argv.slice(2));
}
