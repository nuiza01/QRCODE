import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { lstat, mkdtemp, mkdir, readFile, readdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { syncBuiltinESMExports } from "node:module";
import test from "node:test";

import {
  EDGE_KINDS,
  STATIC_SUPPORTED,
  STATIC_UNKNOWN,
  STATIC_VIOLATION,
  SUPPORTED_PROFILE,
  inspectTurbopackEmission,
  runCli,
} from "./inspect-turbopack-emission.mjs";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const ascii = (a, b) => Buffer.from(a).compare(Buffer.from(b));

async function walk(root, directory = root, relativeDirectory = "", rows = []) {
  const entries = await readdir(directory);
  entries.sort(ascii);
  for (const name of entries) {
    const path = join(directory, name);
    const relativePath = relativeDirectory ? `${relativeDirectory}/${name}` : name;
    const stat = await lstat(path);
    if (stat.isDirectory()) await walk(root, path, relativePath, rows);
    else if (stat.isFile()) {
      const bytes = await readFile(path);
      rows.push({ sha256: hash(bytes), path: relativePath, size: bytes.length, type: "file" });
    } else if (stat.isSymbolicLink()) {
      rows.push({ path: relativePath, size: stat.size, type: "symlink" });
    }
  }
  return rows;
}

async function manifests(root) {
  const fullRows = await walk(root);
  const scopeRows = fullRows.filter((row) => row.path === "BUILD_ID" || row.path.startsWith("server/app/")
    || row.path.startsWith("static/")).sort((a, b) => ascii(a.path, b.path));
  return {
    full: { count: fullRows.length, canonicalSha256: hash(JSON.stringify(fullRows)), rows: fullRows },
    scope: { count: scopeRows.length, canonicalSha256: hash(JSON.stringify(scopeRows)), rows: scopeRows },
  };
}

function html(inline, script = "/_next/static/chunks/entry.js") {
  return `<!doctype html><html><head><script src="${script}" async=""></script></head><body>${inline}</body></html>`;
}

function bootstrapAndFlight(wire = "1:I[7,[\"/_next/static/chunks/entry.js\"],\"default\"]\n") {
  return `<script>(self.__next_f=self.__next_f||[]).push([0])</script><script>self.__next_f.push([1,${JSON.stringify(wire)}])</script>`;
}

const supportedChunk = `(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,7,t=>{}]);`;

async function fixture({ chunk = supportedChunk, inline = bootstrapAndFlight(), script, extraFiles = {} } = {}) {
  const root = await mkdtemp(join(await realpath(tmpdir()), "nqr130-adapter-"));
  await mkdir(join(root, "server/app"), { recursive: true });
  await mkdir(join(root, "static/chunks"), { recursive: true });
  await writeFile(join(root, "BUILD_ID"), "fixture-build\n");
  for (const route of SUPPORTED_PROFILE.routes) {
    const path = join(root, "server/app", `${route.slice(1)}.html`);
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, html(inline, script));
  }
  await writeFile(join(root, "static/chunks/entry.js"), chunk);
  for (const [relativePath, bytes] of Object.entries(extraFiles)) {
    const path = join(root, relativePath);
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, bytes);
  }
  const expected = await manifests(root);
  return { root, expected };
}

function inputs(expected, overrides = {}) {
  return {
    buildId: "fixture-build",
    sourceInventorySha256: SUPPORTED_PROFILE.sourceInventorySha256,
    dependencySha256: SUPPORTED_PROFILE.dependencySha256,
    nextPackageSha256: SUPPORTED_PROFILE.nextPackageSha256,
    parserSha256: SUPPORTED_PROFILE.parserSha256,
    artifactFull: expected.full,
    artifactScope: expected.scope,
    ...overrides,
  };
}

async function inspect(item, overrides = {}) {
  return inspectTurbopackEmission({ artifactRoot: item.root, expectedInputs: inputs(item.expected, overrides),
    profile: SUPPORTED_PROFILE });
}

test("supported inert registration and bounded Flight import remain diagnostic-only", async (t) => {
  const item = await fixture();
  t.after(() => rm(item.root, { recursive: true, force: true }));
  const result = await inspect(item);
  assert.equal(result.staticStatus, STATIC_SUPPORTED, JSON.stringify(result.diagnostics));
  assert.equal(result.releaseDecision, "BLOCKED");
  assert.deepEqual(result.graph.edgeKinds, EDGE_KINDS);
  assert.ok(result.graph.edges.some((edge) => edge.kind === "registration" && edge.to === "module:7"));
  assert.ok(result.graph.edges.some((edge) => edge.kind === "flight-resolve-preload"
    && edge.to === "static/chunks/entry.js"));
});

test("reviewed ordinary function factory remains supported", async (t) => {
  const item = await fixture({ chunk: `(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,7,function(t){}]);` });
  t.after(() => rm(item.root, { recursive: true, force: true }));
  assert.equal((await inspect(item)).staticStatus, STATIC_SUPPORTED);
});

test("exact deferred loader records creation/load/instantiation without claiming invocation", async (t) => {
  const chunk = `(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,7,t=>{t.v(l=>Promise.all(["static/chunks/lazy.js"].map(x=>t.l(x))).then(()=>l(9)))},9,t=>{}]);`;
  const item = await fixture({ chunk, extraFiles: { "static/chunks/lazy.js": supportedChunk.replace(",7,t", ",10,t") } });
  t.after(() => rm(item.root, { recursive: true, force: true }));
  const result = await inspect(item);
  assert.equal(result.staticStatus, STATIC_SUPPORTED);
  assert.ok(result.graph.edges.some((edge) => edge.kind === "deferred-thunk-creation"));
  assert.ok(result.graph.edges.some((edge) => edge.kind === "explicit-chunk-load"
    && edge.condition === "DEFERRED_INVOCATION"));
  assert.ok(result.graph.edges.some((edge) => edge.kind === "synchronous-instantiation"
    && edge.condition === "AFTER_CHUNK_LOAD"));
  assert.ok(!result.graph.edges.some((edge) => edge.kind === "deferred-invocation"));
  assert.equal(result.releaseDecision, "BLOCKED");
});

test("reviewed literal export tuple is distinct from context invocation", async (t) => {
  const chunk = `(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,7,t=>{t.s(["named",0,"value"],9)}]);`;
  const item = await fixture({ chunk });
  t.after(() => rm(item.root, { recursive: true, force: true }));
  const result = await inspect(item);
  assert.equal(result.staticStatus, STATIC_SUPPORTED);
  assert.ok(result.graph.edges.some((edge) => edge.kind === "alias" && edge.to === "module:9"));
  assert.ok(!result.graph.edges.some((edge) => edge.kind === "deferred-invocation"));
});

test("benign IIFE in a factory is unproven until module instantiation", async (t) => {
  const chunk = `(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,7,t=>{t.v((()=>0)())}]);`;
  const item = await fixture({ chunk });
  t.after(() => rm(item.root, { recursive: true, force: true }));
  const result = await inspect(item);
  assert.equal(result.staticStatus, STATIC_UNKNOWN);
  assert.ok(result.diagnostics.some((item) => item.code === "UNPROVEN_FACTORY_INVOCATION"));
  assert.ok(result.graph.edges.some((edge) => edge.kind === "unknown"
    && edge.condition === "ON_MODULE_INSTANTIATION"));
  assert.equal(result.releaseDecision, "BLOCKED");
});

test("altered registration receiver remains unknown, never framework-whitelisted", async (t) => {
  const item = await fixture({ chunk: supportedChunk.replaceAll("TURBOPACK", "OTHERPACK") });
  t.after(() => rm(item.root, { recursive: true, force: true }));
  const result = await inspect(item);
  assert.equal(result.staticStatus, STATIC_UNKNOWN);
  assert.ok(result.diagnostics.some((entry) => entry.code === "UNSUPPORTED_TOP_LEVEL_EXECUTABLE"));
  assert.equal(result.releaseDecision, "BLOCKED");
});

test("runtime-shaped file remains unknown even when registration parses", async (t) => {
  const item = await fixture({ extraFiles: { "static/chunks/turbopack-runtime.js": `${supportedChunk}(()=>0)();` } });
  t.after(() => rm(item.root, { recursive: true, force: true }));
  const result = await inspect(item);
  assert.equal(result.staticStatus, STATIC_UNKNOWN);
  assert.ok(result.diagnostics.some((entry) => entry.code === "UNSUPPORTED_RUNTIME_BACKEND_SEMANTICS"));
  assert.equal(result.releaseDecision, "BLOCKED");
});

test("unknown Flight wire record stays unknown and is never evaluated", async (t) => {
  const item = await fixture({ inline: bootstrapAndFlight("1:X[\"not-reviewed\"]\n") });
  t.after(() => rm(item.root, { recursive: true, force: true }));
  const result = await inspect(item);
  assert.equal(result.staticStatus, STATIC_UNKNOWN);
  assert.ok(result.diagnostics.some((entry) => entry.code === "UNSUPPORTED_FLIGHT_WIRE_RECORD"));
});

test("Flight tuples validate every URL and registered module destination", async (t) => {
  const external = await fixture({ inline: bootstrapAndFlight("1:I[7,[\"https://example.invalid/eager.js\"],\"default\"]\n") });
  t.after(() => rm(external.root, { recursive: true, force: true }));
  assert.equal((await inspect(external)).staticStatus, STATIC_VIOLATION);

  const missing = await fixture({ inline: bootstrapAndFlight("1:I[999,[\"/_next/static/chunks/entry.js\"],\"default\"]\n") });
  t.after(() => rm(missing.root, { recursive: true, force: true }));
  const missingResult = await inspect(missing);
  assert.equal(missingResult.staticStatus, STATIC_UNKNOWN);
  assert.ok(missingResult.diagnostics.some((entry) => entry.code === "UNRESOLVED_MODULE_DESTINATION"));

  const malformed = await fixture({ inline: bootstrapAndFlight("1:I[7,[1,2],\"default\"]\n") });
  t.after(() => rm(malformed.root, { recursive: true, force: true }));
  assert.equal((await inspect(malformed)).staticStatus, STATIC_UNKNOWN);

  // Turbopack's browser client loads every chunk entry by URL; webpack-style id/path pairs are not this profile.
  const webpackPair = await fixture({ inline: bootstrapAndFlight("1:I[7,[1,\"/_next/static/chunks/entry.js\"],\"default\"]\n") });
  t.after(() => rm(webpackPair.root, { recursive: true, force: true }));
  const webpackPairResult = await inspect(webpackPair);
  assert.equal(webpackPairResult.staticStatus, STATIC_UNKNOWN);
  assert.ok(webpackPairResult.diagnostics.some((entry) => entry.code === "UNSUPPORTED_FLIGHT_IMPORT_RECORD"));
});

test("deferred loader requires exact closure binding and destination", async (t) => {
  const extraFiles = { "static/chunks/lazy.js": supportedChunk.replace(",7,t", ",9,t") };
  const variants = [
    `t.v(l=>Promise.all(["static/chunks/lazy.js"].map(x=>t.l(x))).then((l)=>l(9)))`,
    `t.v(l=>Promise.all(["static/chunks/lazy.js"].map(x=>t.l(x))).then(function*(){return l(9)}))`,
    `t.v(l=>Promise.all(["static/chunks/lazy.js"].map(x=>t.l(x))).then((x=(()=>0)())=>l(9)))`,
    `t.v(t=>Promise.all(["static/chunks/lazy.js"].map(x=>t.l(x))).then(()=>t(9)))`,
    `t.v(l=>Promise.all(["static/chunks/lazy.js"].map(t=>t.l(t))).then(()=>l(9)))`,
    `t.v((...l)=>Promise.all(["static/chunks/lazy.js"].map(x=>t.l(x))).then(()=>l(9)))`,
  ];
  for (const body of variants) {
    const item = await fixture({ chunk: `(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,7,t=>{${body}}]);`, extraFiles });
    t.after(() => rm(item.root, { recursive: true, force: true }));
    assert.equal((await inspect(item)).staticStatus, STATIC_UNKNOWN);
  }
  const missing = await fixture({
    chunk: `(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,7,t=>{t.v(l=>Promise.all(["static/chunks/lazy.js"].map(x=>t.l(x))).then(()=>l(999))) }]);`,
    extraFiles,
  });
  t.after(() => rm(missing.root, { recursive: true, force: true }));
  assert.equal((await inspect(missing)).staticStatus, STATIC_UNKNOWN);
});

test("HTML parser distinguishes comments rawtext template EOF attributes and handlers", async (t) => {
  const cases = [
    { suffix: `<!-- <script src="https://example.invalid/ignored.js"></script> -->`, expected: STATIC_SUPPORTED },
    { suffix: `<textarea><script src="https://example.invalid/ignored.js"></script></textarea>`, expected: STATIC_SUPPORTED },
    { suffix: `<template><script src="https://example.invalid/unknown.js"></script></template>`, expected: STATIC_UNKNOWN },
    { suffix: `<img src="data:," onerror="unknownEffect()">`, expected: STATIC_UNKNOWN },
    { suffix: `<script src="https://example.invalid/eager.js">`, expected: STATIC_VIOLATION },
  ];
  for (const { suffix, expected } of cases) {
    const item = await fixture({ inline: `${bootstrapAndFlight()}${suffix}` });
    t.after(() => rm(item.root, { recursive: true, force: true }));
    assert.equal((await inspect(item)).staticStatus, expected);
  }
  const entity = await fixture({ script: "&#x2f;_next/static/chunks/entry.js" });
  t.after(() => rm(entity.root, { recursive: true, force: true }));
  assert.equal((await inspect(entity)).staticStatus, STATIC_SUPPORTED);
});

test("Next dynamic-segment dollar paths pass the strict identity grammar", async (t) => {
  const item = await fixture({ extraFiles: { "server/app/$d$locale.segment.rsc": "inert" } });
  t.after(() => rm(item.root, { recursive: true, force: true }));
  const result = await inspect(item);
  assert.equal(result.staticStatus, STATIC_SUPPORTED);
});

test("diagnostic overflow is explicit, bounded, and unknown", async (t) => {
  const wire = Array.from({ length: 60 }, (_, index) => `${index.toString(16)}:X[]`).join("\n");
  const item = await fixture({ inline: bootstrapAndFlight(`${wire}\n`) });
  t.after(() => rm(item.root, { recursive: true, force: true }));
  const result = await inspect(item);
  assert.equal(result.staticStatus, STATIC_UNKNOWN);
  assert.equal(result.diagnostics.length, SUPPORTED_PROFILE.limits.diagnostics);
  assert.ok(result.diagnostics.some((entry) => entry.code === "DIAGNOSTIC_RESOURCE_LIMIT"));
});

test("known violation severity is monotonic before and after diagnostic overflow", async (t) => {
  const unknownWire = Array.from({ length: 60 }, (_, index) => `${index.toString(16)}:X[]`).join("\n");
  for (const order of ["before", "after"]) {
    const external = `<script src="https://example.invalid/eager.js"></script>`;
    const unknown = bootstrapAndFlight(`${unknownWire}\n`);
    const item = await fixture({ inline: order === "before" ? `${external}${unknown}` : `${unknown}${external}` });
    t.after(() => rm(item.root, { recursive: true, force: true }));
    const result = await inspect(item);
    assert.equal(result.staticStatus, STATIC_VIOLATION);
    assert.ok(result.diagnosticSummary.violationCount > 0);
    assert.ok(result.diagnostics.some((entry) => entry.severity === "VIOLATION"));
  }
});

test("external executable path is a violation with a fixed non-sensitive diagnostic", async (t) => {
  const item = await fixture({ script: "https://example.invalid/entry.js" });
  t.after(() => rm(item.root, { recursive: true, force: true }));
  const result = await inspect(item);
  assert.equal(result.staticStatus, STATIC_VIOLATION, JSON.stringify(result.diagnostics));
  assert.ok(result.diagnostics.some((entry) => entry.code === "EXTERNAL_EXECUTABLE_REFERENCE"));
  assert.ok(result.diagnostics.every((entry) => !JSON.stringify(entry).includes("example.invalid")));
});

test("one-byte artifact mutation fails exact identity before semantic inspection", async (t) => {
  const item = await fixture();
  t.after(() => rm(item.root, { recursive: true, force: true }));
  await writeFile(join(item.root, "static/chunks/entry.js"), `${supportedChunk}\n`);
  const result = await inspect(item);
  assert.equal(result.staticStatus, STATIC_UNKNOWN);
  assert.ok(result.diagnostics.some((entry) => entry.code === "ARTIFACT_BYTE_IDENTITY_MISMATCH"));
  assert.equal(result.graph.edges.length, 0);
});

test("extra path fails exact identity", async (t) => {
  const item = await fixture();
  t.after(() => rm(item.root, { recursive: true, force: true }));
  await writeFile(join(item.root, "static/chunks/extra.js"), supportedChunk);
  const result = await inspect(item);
  assert.equal(result.staticStatus, STATIC_UNKNOWN);
  assert.ok(result.diagnostics.some((entry) => entry.code === "UNEXPECTED_ARTIFACT_PATH"));
});

test("symlink node cannot be admitted as an artifact file", async (t) => {
  const item = await fixture();
  t.after(() => rm(item.root, { recursive: true, force: true }));
  await symlink("entry.js", join(item.root, "static/chunks/link.js"));
  const result = await inspect(item);
  assert.equal(result.staticStatus, STATIC_UNKNOWN, JSON.stringify(result.diagnostics));
  assert.ok(result.diagnostics.some((entry) => entry.code === "NON_REGULAR_ARTIFACT_NODE"));
});

test("wrong parser/source/dependency lineage stays unknown", async (t) => {
  const item = await fixture();
  t.after(() => rm(item.root, { recursive: true, force: true }));
  for (const key of ["parserSha256", "sourceInventorySha256", "dependencySha256"]) {
    const result = await inspect(item, { [key]: "0".repeat(64) });
    assert.equal(result.staticStatus, STATIC_UNKNOWN);
    assert.ok(result.diagnostics.some((entry) => entry.code === "INPUT_LINEAGE_MISMATCH"));
    assert.equal(result.releaseDecision, "BLOCKED");
  }
});

test("malformed metadata, exports, and duplicate factories remain unknown", async (t) => {
  const malformed = `(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,7,(()=>0)()]);`;
  const item = await fixture({ chunk: malformed });
  t.after(() => rm(item.root, { recursive: true, force: true }));
  const result = await inspect(item);
  assert.equal(result.staticStatus, STATIC_UNKNOWN);
  assert.ok(result.diagnostics.some((entry) => entry.code === "UNSUPPORTED_REGISTRATION_PAYLOAD"));

  const conflict = `${supportedChunk}\n${supportedChunk.replace("t=>{}", "t=>{t.v(1)}")}`;
  const other = await fixture({ chunk: conflict });
  t.after(() => rm(other.root, { recursive: true, force: true }));
  const conflictResult = await inspect(other);
  assert.equal(conflictResult.staticStatus, STATIC_UNKNOWN);
  assert.ok(conflictResult.diagnostics.some((entry) => entry.code === "CONFLICTING_MODULE_REGISTRATION_UNPROVEN"));

  const metadata = await fixture({ chunk: `(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,{otherChunks:[],runtimeModuleIds:[]}]);` });
  t.after(() => rm(metadata.root, { recursive: true, force: true }));
  assert.equal((await inspect(metadata)).staticStatus, STATIC_UNKNOWN);

  const badExport = await fixture({ chunk: `(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,7,t=>{t.s(["x",1],9)}]);` });
  t.after(() => rm(badExport.root, { recursive: true, force: true }));
  assert.equal((await inspect(badExport)).staticStatus, STATIC_UNKNOWN);
  const shortExport = await fixture({ chunk: `(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,7,t=>{t.s(["x",0],9)}]);` });
  t.after(() => rm(shortExport.root, { recursive: true, force: true }));
  assert.equal((await inspect(shortExport)).staticStatus, STATIC_UNKNOWN);
});

test("invalid UTF-8 is unknown with fixed diagnostics", async (t) => {
  const item = await fixture();
  t.after(() => rm(item.root, { recursive: true, force: true }));
  await writeFile(join(item.root, "static/chunks/entry.js"), Buffer.from([0xff]));
  item.expected = await manifests(item.root);
  const result = await inspect(item);
  assert.equal(result.staticStatus, STATIC_UNKNOWN);
  assert.ok(result.diagnostics.some((entry) => entry.code === "INVALID_UTF8"));
});

test("resource limit cannot become supported", async (t) => {
  const item = await fixture({ chunk: "0".repeat(SUPPORTED_PROFILE.limits.bytesPerExecutableFile + 1) });
  t.after(() => rm(item.root, { recursive: true, force: true }));
  const result = await inspect(item);
  assert.equal(result.staticStatus, STATIC_UNKNOWN);
  assert.ok(result.diagnostics.some((entry) => entry.code === "RESOURCE_LIMIT"));
});

test("actual external-loader guard is mutation-sensitive", async (t) => {
  const malicious = supportedChunk.replace("t=>{}", `t=>{t.v(l=>Promise.all(["https://example.invalid/eager.js"].map(x=>t.l(x))).then(()=>l(7)))}`);
  const item = await fixture({ chunk: malicious });
  t.after(() => rm(item.root, { recursive: true, force: true }));
  const result = await inspect(item);
  assert.equal(result.staticStatus, STATIC_VIOLATION);
  assert.equal(result.releaseDecision, "BLOCKED");
});

test("semantic parsing stays bound to identity-admitted buffers", async (t) => {
  const item = await fixture({ chunk: "unknownEffect();" });
  t.after(() => rm(item.root, { recursive: true, force: true }));
  const entry = join(item.root, "static/chunks/entry.js");
  const originalOpen = fs.open;
  let reads = 0;
  fs.open = async function patchedOpen(path, ...args) {
    if (path === entry && ++reads === 2) await writeFile(entry, supportedChunk);
    return originalOpen.call(this, path, ...args);
  };
  syncBuiltinESMExports();
  let result;
  try {
    result = await inspect(item);
  } finally {
    fs.open = originalOpen;
    syncBuiltinESMExports();
  }
  assert.equal(result.staticStatus, STATIC_UNKNOWN);
  assert.ok(result.diagnostics.some((entry) => entry.code === "ARTIFACT_BYTE_IDENTITY_MISMATCH"));
  assert.equal(result.releaseDecision, "BLOCKED");
});

test("public API contains getters proxies and invalid identity without echo", async (t) => {
  const item = await fixture();
  t.after(() => rm(item.root, { recursive: true, force: true }));
  const marker = "NQR130_PRIVATE_SYNTHETIC_MARKER";
  const getterResult = await inspectTurbopackEmission({
    artifactRoot: item.root,
    get expectedInputs() { throw new Error(marker); },
    profile: SUPPORTED_PROFILE,
  });
  assert.equal(getterResult.staticStatus, STATIC_UNKNOWN);
  assert.ok(!JSON.stringify(getterResult).includes(marker));
  const proxyResult = await inspectTurbopackEmission(new Proxy({}, { get() { throw new Error(marker); } }));
  assert.equal(proxyResult.staticStatus, STATIC_UNKNOWN);
  assert.ok(!JSON.stringify(proxyResult).includes(marker));
  assert.equal((await inspectTurbopackEmission(null)).releaseDecision, "BLOCKED");
  const invalid = await inspect(item, { sourceInventorySha256: marker });
  assert.equal(invalid.identity.sourceInventorySha256, null);
  assert.ok(!JSON.stringify(invalid).includes(marker));
});

test("CLI bounds descriptor bytes and never echoes invalid identity", async (t) => {
  const item = await fixture();
  t.after(() => rm(item.root, { recursive: true, force: true }));
  const fullPath = join(item.root, "expected-full.json");
  const scopePath = join(item.root, "expected-scope.json");
  const descriptorPath = join(item.root, "expected.json");
  await writeFile(fullPath, JSON.stringify(item.expected.full));
  await writeFile(scopePath, JSON.stringify(item.expected.scope));
  const marker = "NQR130_PRIVATE_SYNTHETIC_MARKER";
  await writeFile(descriptorPath, JSON.stringify({
    ...inputs(item.expected, { sourceInventorySha256: marker }),
    artifactFull: undefined,
    artifactScope: undefined,
    artifactFullManifestPath: fullPath,
    artifactScopeManifestPath: scopePath,
  }));
  let output = "";
  const code = await runCli(["--artifact", item.root, "--expected", descriptorPath], (value) => { output += value; });
  assert.equal(code, 0);
  assert.ok(!output.includes(marker));
  assert.equal(JSON.parse(output).releaseDecision, "BLOCKED");
  await writeFile(descriptorPath, " ".repeat(SUPPORTED_PROFILE.limits.descriptorBytes + 1));
  output = "";
  assert.equal(await runCli(["--artifact", item.root, "--expected", descriptorPath], (value) => { output += value; }), 2);
  assert.equal(JSON.parse(output).diagnostics[0].code, "CLI_INPUT_FAILURE");
});

test("manifest and traversal limits stop before hostile row access or deep descent", async (t) => {
  const item = await fixture();
  t.after(() => rm(item.root, { recursive: true, force: true }));
  const rows = new Array(SUPPORTED_PROFILE.limits.identityFiles + 1);
  Object.defineProperty(rows, 0, { get() { throw new Error("MUST_NOT_READ_ROW"); } });
  const oversized = await inspectTurbopackEmission({
    artifactRoot: item.root,
    expectedInputs: inputs(item.expected, {
      artifactFull: { count: rows.length, canonicalSha256: "0".repeat(64), rows },
    }),
    profile: SUPPORTED_PROFILE,
  });
  assert.equal(oversized.staticStatus, STATIC_UNKNOWN);
  assert.ok(oversized.diagnostics.some((entry) => entry.code === "INVALID_EXPECTED_MANIFEST"));

  const deepPath = `${Array.from({ length: SUPPORTED_PROFILE.limits.identityDepth + 2 }, () => "d").join("/")}/inert.txt`;
  const deep = await fixture({ extraFiles: { [deepPath]: "inert" } });
  t.after(() => rm(deep.root, { recursive: true, force: true }));
  const deepResult = await inspect(deep);
  assert.equal(deepResult.staticStatus, STATIC_UNKNOWN);
  assert.ok(deepResult.diagnostics.some((entry) => entry.code === "IDENTITY_DEPTH_LIMIT"));
});

test("Flight budgets accumulate per route and graph nodes are capped", async (t) => {
  const recordBatch = Array.from({ length: 100 }, (_, index) => `${index.toString(16)}:I[7,["/_next/static/chunks/entry.js"],"default"]`).join("\n");
  const inline = Array.from({ length: 21 }, () => `<script>self.__next_f.push([1,${JSON.stringify(`${recordBatch}\n`)}])</script>`).join("");
  const flightItem = await fixture({ inline });
  t.after(() => rm(flightItem.root, { recursive: true, force: true }));
  const flightResult = await inspect(flightItem);
  assert.equal(flightResult.staticStatus, STATIC_UNKNOWN);
  assert.ok(flightResult.diagnosticSummary.unknownCount > 0);

  const bootstraps = Array.from({ length: 200 }, () => `<script>(self.__next_f=self.__next_f||[]).push([0])</script>`).join("");
  const nodeItem = await fixture({ inline: bootstraps });
  t.after(() => rm(nodeItem.root, { recursive: true, force: true }));
  const nodeResult = await inspect(nodeItem);
  assert.equal(nodeResult.staticStatus, STATIC_UNKNOWN);
  assert.ok(nodeResult.diagnostics.some((entry) => entry.code === "GRAPH_NODE_RESOURCE_LIMIT"));
  assert.ok(nodeResult.graph.nodes.length <= SUPPORTED_PROFILE.limits.graphEdges);
});

test("foreign scripts and nested browsing contexts fail closed without disturbing inert HTML", async (t) => {
  const cases = [
    `<svg><script href="https://example.invalid/inert.js"></script></svg>`,
    `<svg xmlns:xlink="http://www.w3.org/1999/xlink"><script xlink:href="https://example.invalid/inert.js"></script></svg>`,
    `<iframe srcdoc="&lt;script&gt;unknown()&lt;/script&gt;"></iframe>`,
    `<iframe src="https://example.invalid/inert.html"></iframe>`,
    `<object type="text/html" data="https://example.invalid/inert.html"></object>`,
    `<object type="image/svg+xml" data="https://example.invalid/active.svg"></object>`,
    `<embed type="image/svg+xml" src="https://example.invalid/active.svg">`,
  ];
  for (const [index, suffix] of cases.entries()) {
    const item = await fixture({ inline: `${bootstrapAndFlight()}${suffix}` });
    t.after(() => rm(item.root, { recursive: true, force: true }));
    const result = await inspect(item);
    assert.equal(result.staticStatus, STATIC_UNKNOWN, JSON.stringify(result.diagnostics));
    assert.ok(result.diagnostics.some((entry) => entry.code === (index < 2
      ? "UNMODELED_FOREIGN_SCRIPT" : "UNMODELED_NESTED_BROWSING_CONTEXT")));
  }
  const plainSvg = await fixture({ inline: `${bootstrapAndFlight()}<svg><path d="M0 0"></path></svg>` });
  t.after(() => rm(plainSvg.root, { recursive: true, force: true }));
  assert.equal((await inspect(plainSvg)).staticStatus, STATIC_SUPPORTED);

  const frameset = await fixture();
  t.after(() => rm(frameset.root, { recursive: true, force: true }));
  for (const route of SUPPORTED_PROFILE.routes) {
    await writeFile(join(frameset.root, "server/app", `${route.slice(1)}.html`),
      `<!doctype html><html><head><script src="/_next/static/chunks/entry.js" async=""></script>${bootstrapAndFlight()}</head><frameset><frame src="https://example.invalid/inert.html"></frameset></html>`);
  }
  frameset.expected = await manifests(frameset.root);
  const framesetResult = await inspect(frameset);
  assert.equal(framesetResult.staticStatus, STATIC_UNKNOWN, JSON.stringify(framesetResult.diagnostics));
  assert.ok(framesetResult.diagnostics.some((entry) => entry.code === "UNMODELED_NESTED_BROWSING_CONTEXT"));
});

test("deferred loader requires a free global Promise binding", async (t) => {
  const lazy = { "static/chunks/lazy.js": supportedChunk.replace(",7,t", ",9,t") };
  const head = `(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,`;
  const variants = [
    `${head}7,t=>{t.v(Promise=>Promise.all(["static/chunks/lazy.js"].map(x=>t.l(x))).then(()=>Promise(9)))}]);`,
    `${head}7,Promise=>{Promise.v(l=>Promise.all(["static/chunks/lazy.js"].map(x=>Promise.l(x))).then(()=>l(9)))}]);`,
    `${head}7,function Promise(t){t.v(l=>Promise.all(["static/chunks/lazy.js"].map(x=>t.l(x))).then(()=>l(9)))}]);`,
  ];
  for (const chunk of variants) {
    const item = await fixture({ chunk, extraFiles: lazy });
    t.after(() => rm(item.root, { recursive: true, force: true }));
    const result = await inspect(item);
    assert.equal(result.staticStatus, STATIC_UNKNOWN);
    assert.ok(result.diagnostics.some((entry) => entry.code === "UNSUPPORTED_EXPORT_VALUE"));
  }
});

test("module destinations must be registered in their modeled load context", async (t) => {
  const head = `(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,`;
  const orphanFlight = await fixture({
    inline: bootstrapAndFlight(`1:I[999,["/_next/static/chunks/entry.js"],"default"]\n`),
    extraFiles: { "static/chunks/unreferenced.js": `${head}999,t=>{}]);` },
  });
  t.after(() => rm(orphanFlight.root, { recursive: true, force: true }));
  const orphanFlightResult = await inspect(orphanFlight);
  assert.equal(orphanFlightResult.staticStatus, STATIC_UNKNOWN);
  assert.ok(orphanFlightResult.diagnostics.some((entry) => entry.code === "UNRESOLVED_MODULE_DESTINATION"));

  const deferred = `${head}7,t=>{t.v(l=>Promise.all(["static/chunks/lazy.js"].map(x=>t.l(x))).then(()=>l(9)))}]);`;
  const orphanDeferred = await fixture({ chunk: deferred, extraFiles: {
    "static/chunks/lazy.js": `${head}10,t=>{}]);`,
    "static/chunks/unreferenced.js": `${head}9,t=>{}]);`,
  } });
  t.after(() => rm(orphanDeferred.root, { recursive: true, force: true }));
  const orphanDeferredResult = await inspect(orphanDeferred);
  assert.equal(orphanDeferredResult.staticStatus, STATIC_UNKNOWN);
  assert.ok(orphanDeferredResult.diagnostics.some((entry) => entry.code === "UNRESOLVED_MODULE_DESTINATION"));

  const reachableDeferred = await fixture({ chunk: deferred,
    extraFiles: { "static/chunks/lazy.js": `${head}9,t=>{}]);` } });
  t.after(() => rm(reachableDeferred.root, { recursive: true, force: true }));
  assert.equal((await inspect(reachableDeferred)).staticStatus, STATIC_SUPPORTED);

  const rootWire = `1:I[7,["/_next/static/chunks/entry.js"],"default"]\n2:I[999,["/_next/static/chunks/entry.js"],"default"]\n`;
  const classicRoot = await fixture({
    inline: `${bootstrapAndFlight(rootWire)}<script src="/_next/static/chunks/legacy.js"></script>`,
    extraFiles: { "static/chunks/legacy.js": `${head}999,t=>{}]);` },
  });
  t.after(() => rm(classicRoot.root, { recursive: true, force: true }));
  assert.equal((await inspect(classicRoot)).staticStatus, STATIC_SUPPORTED);

  const nomoduleRoot = await fixture({
    inline: `${bootstrapAndFlight(rootWire)}<script nomodule src="/_next/static/chunks/legacy.js"></script>`,
    extraFiles: { "static/chunks/legacy.js": `${head}999,t=>{}]);` },
  });
  t.after(() => rm(nomoduleRoot.root, { recursive: true, force: true }));
  const nomoduleResult = await inspect(nomoduleRoot);
  assert.equal(nomoduleResult.staticStatus, STATIC_UNKNOWN);
  assert.ok(nomoduleResult.diagnostics.some((entry) => entry.code === "UNRESOLVED_MODULE_DESTINATION"));
});

test("duplicate or conflicting Flight wire record identities remain unproved", async (t) => {
  const duplicate = await fixture({ inline: bootstrapAndFlight(
    `1:I[7,["/_next/static/chunks/entry.js"],"default"]\n1:I[7,["/_next/static/chunks/entry.js"],"default"]\n`,
  ) });
  t.after(() => rm(duplicate.root, { recursive: true, force: true }));
  const duplicateResult = await inspect(duplicate);
  assert.equal(duplicateResult.staticStatus, STATIC_UNKNOWN);
  assert.ok(duplicateResult.diagnostics.some((entry) => entry.code === "DUPLICATE_FLIGHT_RECORD_UNPROVEN"));
  const conflict = await fixture({
    chunk: supportedChunk.replace("7,t=>{}", "7,t=>{},9,t=>{}"),
    inline: bootstrapAndFlight(
      `1:I[7,["/_next/static/chunks/entry.js"],"default"]\n1:I[9,["/_next/static/chunks/entry.js"],"other"]\n`,
    ),
  });
  t.after(() => rm(conflict.root, { recursive: true, force: true }));
  const conflictResult = await inspect(conflict);
  assert.equal(conflictResult.staticStatus, STATIC_UNKNOWN);
  assert.ok(conflictResult.diagnostics.some((entry) => entry.code === "CONFLICTING_FLIGHT_RECORD_UNPROVEN"));

  // The runtime folds hex nibbles into a 32-bit row ID: "01" and "100000001" both alias row 1.
  for (const aliasId of ["01", "100000001"]) {
    const alias = await fixture({
      chunk: supportedChunk.replace("7,t=>{}", "7,t=>{},9,t=>{}"),
      inline: bootstrapAndFlight(
        `1:I[7,["/_next/static/chunks/entry.js"],"default"]\n${aliasId}:I[9,["/_next/static/chunks/entry.js"],"other"]\n`,
      ),
    });
    t.after(() => rm(alias.root, { recursive: true, force: true }));
    const aliasResult = await inspect(alias);
    assert.equal(aliasResult.staticStatus, STATIC_UNKNOWN);
    assert.ok(aliasResult.diagnostics.some((entry) => entry.code === "UNSUPPORTED_FLIGHT_ROW_ID"));
  }
  const distinct = await fixture({
    chunk: supportedChunk.replace("7,t=>{}", "7,t=>{},9,t=>{}"),
    inline: bootstrapAndFlight(
      `1:I[7,["/_next/static/chunks/entry.js"],"default"]\n2:I[9,["/_next/static/chunks/entry.js"],"other"]\n`,
    ),
  });
  t.after(() => rm(distinct.root, { recursive: true, force: true }));
  assert.equal((await inspect(distinct)).staticStatus, STATIC_SUPPORTED);
});

test("cumulative executable budget is charged at the real admission call site", async (t) => {
  const item = await fixture();
  t.after(() => rm(item.root, { recursive: true, force: true }));
  const { limits } = SUPPORTED_PROFILE;
  let used = 0;
  for (const row of item.expected.full.rows) {
    if ((row.path.startsWith("server/app/") && row.path.endsWith(".html"))
      || (row.path.startsWith("static/chunks/") && row.path.endsWith(".js"))) used += row.size;
  }
  let remaining = limits.executableBytes - used;
  const pads = [];
  for (let index = 0; remaining > 0; index += 1) {
    const size = Math.min(limits.bytesPerExecutableFile, remaining);
    const path = join(item.root, `static/chunks/pad-${index}.js`);
    await writeFile(path, `/*${"a".repeat(size - 4)}*/`);
    pads.push(path);
    remaining -= size;
  }
  item.expected = await manifests(item.root);
  const exact = await inspect(item);
  assert.equal(exact.staticStatus, STATIC_SUPPORTED, JSON.stringify(exact.diagnostics));

  const last = pads.at(-1);
  const lastBytes = await readFile(last);
  await writeFile(last, `/*a${lastBytes.subarray(2).toString("latin1")}`);
  item.expected = await manifests(item.root);
  const over = await inspect(item);
  assert.equal(over.staticStatus, STATIC_UNKNOWN);
  assert.ok(over.diagnostics.some((entry) => entry.code === "RESOURCE_LIMIT"));
  assert.equal(over.releaseDecision, "BLOCKED");
});

test("ancestor-directory substitution is detected even when bytes and final paths are restored", async (t) => {
  const item = await fixture();
  t.after(() => rm(item.root, { recursive: true, force: true }));
  const base = await mkdtemp(join(await realpath(tmpdir()), "nqr130-directory-swap-"));
  t.after(() => rm(base, { recursive: true, force: true }));
  const chunks = join(item.root, "static/chunks");
  const parked = join(base, "parked-chunks");
  const sibling = join(base, "owned-sibling");
  await mkdir(sibling, { recursive: true });
  await writeFile(join(sibling, "entry.js"), await readFile(join(chunks, "entry.js")));
  const originalOpendir = fs.opendir;
  const originalOpen = fs.open;
  let redirected = false;
  let restored = false;
  fs.opendir = async function patchedOpendir(path, ...args) {
    if (path === chunks && !redirected) {
      await fs.rename(chunks, parked);
      await symlink(sibling, chunks);
      redirected = true;
    }
    return originalOpendir.call(this, path, ...args);
  };
  fs.open = async function patchedOpen(path, ...args) {
    const handle = await originalOpen.call(this, path, ...args);
    if (path === join(chunks, "entry.js") && redirected && !restored) {
      await fs.unlink(chunks);
      await fs.rename(parked, chunks);
      restored = true;
    }
    return handle;
  };
  syncBuiltinESMExports();
  let result;
  try {
    result = await inspect(item);
  } finally {
    fs.opendir = originalOpendir;
    fs.open = originalOpen;
    syncBuiltinESMExports();
    if (redirected && !restored) {
      await fs.unlink(chunks);
      await fs.rename(parked, chunks);
      restored = true;
    }
  }
  assert.equal(redirected, true);
  assert.equal(restored, true);
  assert.equal(result.staticStatus, STATIC_UNKNOWN);
  assert.ok(result.diagnostics.some((entry) => entry.code === "ARTIFACT_DIRECTORY_IDENTITY_MISMATCH"));
});

test("ancestor substitution during a leaf open cannot admit a file outside the artifact root", async (t) => {
  const item = await fixture();
  t.after(() => rm(item.root, { recursive: true, force: true }));
  const base = await mkdtemp(join(await realpath(tmpdir()), "nqr130-leaf-swap-"));
  t.after(() => rm(base, { recursive: true, force: true }));
  const chunks = join(item.root, "static/chunks");
  const target = join(chunks, "entry.js");
  const parked = join(base, "parked-chunks");
  const sibling = join(base, "owned-sibling");
  await mkdir(sibling, { recursive: true });
  await writeFile(join(sibling, "entry.js"), await readFile(target));
  const originalLstat = fs.lstat;
  let redirected = false;
  let restored = false;
  // Swap after the directory's last anchor check and restore before the reader's own path identity check.
  fs.lstat = async function patchedLstat(path, options) {
    if (path === target && !options?.bigint && !redirected) {
      await fs.rename(chunks, parked);
      await symlink(sibling, chunks);
      redirected = true;
    }
    const stat = await originalLstat.call(this, path, options);
    if (path === target && options?.bigint && redirected && !restored) {
      await fs.unlink(chunks);
      await fs.rename(parked, chunks);
      restored = true;
    }
    return stat;
  };
  syncBuiltinESMExports();
  let result;
  try {
    result = await inspect(item);
  } finally {
    fs.lstat = originalLstat;
    syncBuiltinESMExports();
    if (redirected && !restored) {
      await fs.unlink(chunks);
      await fs.rename(parked, chunks);
      restored = true;
    }
  }
  assert.equal(redirected, true);
  assert.equal(restored, true);
  assert.equal(result.staticStatus, STATIC_UNKNOWN, JSON.stringify(result.diagnostics));
  assert.ok(result.diagnostics.some((entry) => entry.code === "ARTIFACT_PATH_IDENTITY_MISMATCH"
    || entry.code === "ARTIFACT_FILE_IDENTITY_CHANGED"));
});

test("runCli contains hostile argument reads while leaving writer failures distinct", async () => {
  const marker = new Error("NQR130_PRIVATE_SYNTHETIC_MARKER");
  for (const args of [
    null,
    new Proxy([], { get() { throw marker; } }),
    ["--artifact", {}, "--expected", {}],
  ]) {
    let output = "";
    const code = await runCli(args, (value) => { output += value; });
    assert.equal(code, 2);
    assert.equal(JSON.parse(output).diagnostics[0].code, "INVALID_CLI_ARGUMENTS");
    assert.ok(!output.includes(marker.message));
  }
  await assert.rejects(() => runCli([], () => { throw new Error("TRUSTED_WRITER_FAILURE"); }), /TRUSTED_WRITER_FAILURE/);
});
