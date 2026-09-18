import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs, { appendFile, cp, lstat, mkdtemp, mkdir, readFile, readdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { createRequire, isBuiltin, syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import { SUPPORTED_PROFILE, inspectTurbopackEmission } from "./inspect-turbopack-emission.mjs";
import {
  ADMITTED_ACCEPTANCE_SHA256,
  BundleBoundaryError,
  FORBIDDEN_INITIAL_MARKERS,
  INSPECTION_LIMITS,
  LEGACY_CLOSURE,
  REQUIRED_TIMING_SCENARIOS,
  TIMING_SCENARIO_ROUTES,
  evaluateBundleBoundary,
  inspectInitialBundleBoundary,
  readGateRevision,
  startupReachableChunks,
  verifyInitialBundleBoundary,
} from "./verify-initial-bundle-boundary.mjs";
import { routePaths } from "./verify-origin-artifacts.mjs";

const MODULE_ROOT = '<script type="module" src="/_next/static/chunks/shell.js?v=1#entry"></script>';
const CLASSIC_ROOT = '<script src="/_next/static/chunks/shell.js"></script>';

async function withFixture({ chunks = { "shell.js": "void 0;" }, html = MODULE_ROOT, htmlByRoute, setup }, callback) {
  const root = await mkdtemp(join(tmpdir(), "nqr-bundle-reset-"));
  const buildDir = join(root, ".next");
  try {
    await mkdir(join(buildDir, "server/app"), { recursive: true });
    await mkdir(join(buildDir, "static/chunks"), { recursive: true });
    for (const [path, bytes] of Object.entries(chunks)) {
      const target = join(buildDir, "static/chunks", path);
      await mkdir(join(target, ".."), { recursive: true });
      await writeFile(target, bytes);
    }
    for (const route of routePaths) {
      const target = join(buildDir, "server/app", `${route.slice(1)}.html`);
      await mkdir(join(target, ".."), { recursive: true });
      await writeFile(target, htmlByRoute?.[route] ?? html);
    }
    await setup?.({ buildDir, root });
    return await callback(buildDir);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function codes(result) {
  return result.evidence.diagnostics.map(({ code }) => code);
}

function readCount(result, path) {
  return result.evidence.fileReads?.find((item) => item.path === path)?.count ?? 0;
}

async function inspectSource(source, { html = MODULE_ROOT, chunks = {} } = {}) {
  return withFixture({ chunks: { "shell.js": source, ...chunks }, html }, inspectInitialBundleBoundary);
}

function paddedProgram(size, prefix = "void 0;") {
  assert.ok(Buffer.byteLength(prefix) + 4 <= size);
  return Buffer.from(`${prefix}/*${" ".repeat(size - Buffer.byteLength(prefix) - 4)}*/`);
}

test("publishes only scoped inspection status and always blocks release", async () => {
  await withFixture({
    chunks: {
      "shell.js": 'import "./a.js"; export const ready = true;',
      "a.js": 'export * from "./b.js";',
      "b.js": 'import "./a.js"; export const version = 1;',
      "heavy.js": `void "${FORBIDDEN_INITIAL_MARKERS.join(" ")}";`,
    },
    html: `${MODULE_ROOT}<script type="application/json">{"inert":true}</script>`,
  }, async (buildDir) => {
    const result = await inspectInitialBundleBoundary(buildDir);
    assert.equal(result.schemaVersion, 1);
    assert.equal(result.scope, "HTML_ROOTS_AND_STATIC_ESM_ONLY");
    assert.equal(result.assetChecks, "PASS");
    assert.equal(result.moduleSyntax, "PASS_CLOSED_STATIC_SUBSET");
    assert.equal(result.runtimeProvenance, "NEEDS_EMISSION_REVIEW");
    assert.equal(result.browserStartupTiming, "UNVERIFIED");
    assert.equal(result.releaseDecision, "BLOCKED");
    assert.equal("success" in result, false);
    assert.equal("pass" in result, false);
    assert.deepEqual(result.evidence.assets.map(({ path }) => path), [
      "/_next/static/chunks/a.js",
      "/_next/static/chunks/b.js",
      "/_next/static/chunks/shell.js",
    ]);
    assert.equal(result.evidence.staticEdges.length, 3);
    assert.equal(result.evidence.entries.filter(({ kind }) => kind === "script").length, 22);
    assert.equal(result.evidence.html.length, 22);
    assert.equal(result.evidence.inputManifest.files.length, 25);
    assert.equal(result.evidence.parser.module, "next/dist/compiled/acorn/acorn");
    assert.ok(result.evidence.entries.some(({ alias }) => alias === "/_next/static/chunks/shell.js?v=1#entry"));
    assert.ok(!JSON.stringify(result).includes("heavy.js"));
    await assert.rejects(() => verifyInitialBundleBoundary(buildDir), (error) =>
      error instanceof BundleBoundaryError && error.code === "NQR_BUNDLE_NEEDS_EMISSION_REVIEW");
  });
});

test("asset manifest is deterministic and hashes the same admitted bytes", async () => {
  await withFixture({ chunks: { "shell.js": "export const ready=true;" } }, async (buildDir) => {
    const first = await inspectInitialBundleBoundary(buildDir);
    const second = await inspectInitialBundleBoundary(buildDir);
    assert.deepEqual(first, second);
    const asset = first.evidence.assets[0];
    assert.equal(asset.sha256, createHash("sha256").update("export const ready=true;").digest("hex"));
    assert.equal(first.evidence.assetManifestSha256,
      createHash("sha256").update(JSON.stringify(first.evidence.assetManifest)).digest("hex"));
  });
});

test("retains the complete NQR080/NQR082 unsupported analyzer corpus", async (t) => {
  const cases = [
    ["top-level import", 'void import("./heavy.js");'],
    ["direct IIFE", '(()=>import("./heavy.js"))()'],
    ["arbitrary callback", 'run(()=>import("./heavy.js"))'],
    ["factory s.l", '(globalThis.TURBOPACK ||= []).push([1,s=>{s.l("static/chunks/heavy.js")}]);'],
    ["runtime substring spoof", 'void "globalThis.TURBOPACK TURBOPACK_NEXT_CHUNK_URLS"; const p="./heavy.js"; importScripts(p);'],
    ["global importScripts", 'globalThis.importScripts("./heavy.js")'],
    ["multiple importScripts", 'importScripts("./a.js"); importScripts("./b.js");'],
    ["computed global importScripts", 'self["importScripts"]("./heavy.js");'],
    ["aliased importScripts", 'const load=globalThis.importScripts;load("./heavy.js");'],
    ["startup sequence argument", 'void import((globalThis.inert="jsPDF","./heavy.js"));'],
    ["event sequence argument", 'document.addEventListener("click",()=>import((globalThis.inert="jsPDF","./heavy.js")));'],
    ["direct s.l", 's.l("static/chunks/heavy.js");'],
    ["computed s.l", 's["l"](getChunkPath());'],
    ["unknown computed loader", 's[loader]("static/chunks/heavy.js");'],
    ["listener and startup dispatch", 'document.addEventListener("click",()=>import("./heavy.js"));document.dispatchEvent(new Event("click"))'],
    ["local document", 'const document={addEventListener(_event,fn){fn()}};document.addEventListener("click",()=>import("./heavy.js"));'],
    ["shadowed document parameter", '(document=>document.addEventListener("click",()=>import("./heavy.js")))({addEventListener(_event,fn){fn()}});'],
    ["replaced listener", 'document.addEventListener=(_event,fn)=>fn();document.addEventListener("click",()=>import("./heavy.js"));'],
    ["destructured l", 'const {l:load}=s;load("static/chunks/heavy.js")'],
    ["computed destructured l", 'const {["l"]:load}=s;load("static/chunks/heavy.js")'],
    ["direct alias", 'const load=s.l;load("static/chunks/heavy.js")'],
    ["direct capital L", 's.L("static/chunks/heavy.js")'],
    ["factory capital L", '(globalThis.TURBOPACK||=[]).push([1,s=>s.L("static/chunks/heavy.js")])'],
    ["untriggered click", 'document.addEventListener("click",()=>import("./heavy.js"))'],
    ["stored click function", 'export const onClick=()=>import("./heavy.js");'],
    ["s.v wrapper", `(globalThis.TURBOPACK ||= []).push([69579, s => {
      s.v(t => Promise.all(["static/chunks/heavy.js"].map(path => s.l(path)))
        .then(() => t(66174)));
    }]);`],
  ];
  for (const [name, source] of cases) {
    await t.test(name, async () => {
      const result = await inspectSource(source, { chunks: { "heavy.js": 'void "qr-code-styling";' } });
      assert.equal(result.moduleSyntax, "UNSUPPORTED");
      assert.equal(result.releaseDecision, "BLOCKED");
      assert.deepEqual(result.evidence.assets.map(({ path }) => path), ["/_next/static/chunks/shell.js"]);
      assert.ok(codes(result).includes("UNSUPPORTED_EXECUTABLE_FORM"));
    });
  }
});

test("NQR074 reachable marker cases fail static policy and use fixed wrapper code", async (t) => {
  for (const [name, source, html] of [
    ["query root", "void 0;", `${MODULE_ROOT}<script src="/_next/static/chunks/heavy.js?v=1"></script>`],
    ["static leaf", 'import "./heavy.js";', MODULE_ROOT],
  ]) {
    await t.test(name, async () => {
      await withFixture({ chunks: { "shell.js": source, "heavy.js": 'void "qr-code-styling jsPDF";' }, html }, async (buildDir) => {
        const result = await inspectInitialBundleBoundary(buildDir);
        assert.equal(result.assetChecks, "FAIL");
        assert.ok(codes(result).includes("FORBIDDEN_INITIAL_MARKER"));
        await assert.rejects(() => verifyInitialBundleBoundary(buildDir), (error) =>
          error.code === "NQR_BUNDLE_STATIC_CHECK_FAILED" && error.message === "NQR_BUNDLE_STATIC_CHECK_FAILED");
      });
    });
  }
});

test("accepts only the complete closed grammar", async (t) => {
  const accepted = [
    ";;;", '"directive"; true; false; null; 1.5; void 0;',
    "const a=1,b=false,c=null,d='x';", "export const ready=true, version=1;",
    'import "./a.js"; export * from "./a.js";',
  ];
  for (const [index, source] of accepted.entries()) {
    await t.test(String(index), async () => {
      const result = await inspectSource(source, { chunks: { "a.js": "export const a=1;" } });
      assert.equal(result.moduleSyntax, "PASS_CLOSED_STATIC_SUBSET");
      assert.equal(result.assetChecks, "PASS");
    });
  }
});

test("rejects every production outside the closed grammar", async (t) => {
  const rejected = [
    "foo();", "obj.value;", "x=1;", "const {x}=obj;", "class X {}", 'import("./a.js")',
    'import value from "./a.js";', 'export { value } from "./a.js";', 'export * as ns from "./a.js";',
    "function f(){}", "const x=`template`;", "const x=/re/;", "const x=1n;", "void foo;",
  ];
  for (const [index, source] of rejected.entries()) {
    await t.test(String(index), async () => {
      const result = await inspectSource(source, { chunks: { "a.js": "void 0;" } });
      assert.equal(result.moduleSyntax, "UNSUPPORTED");
      const issue = result.evidence.diagnostics.find(({ code }) => code === "UNSUPPORTED_EXECUTABLE_FORM");
      assert.equal(issue.reason, "TOP_LEVEL_PRODUCTION_OUTSIDE_CLOSED_SUBSET");
      assert.ok(Number.isInteger(issue.span.start) && Number.isInteger(issue.span.end));
    });
  }
});

test("does not exempt installed analyzer runtime or byte/path variants", async (t) => {
  const runtimePath = join(process.cwd(), "node_modules/next/dist/bundle-analyzer/_next/static/chunks/turbopack-0_jd6_0ca14du.js");
  const runtime = await readFile(runtimePath);
  for (const [name, filename, bytes] of [
    ["exact", "turbopack-0_jd6_0ca14du.js", runtime],
    ["one byte", "turbopack-0_jd6_0ca14du.js", Buffer.concat([runtime, Buffer.from(";")])],
    ["renamed", "runtime-copy.js", runtime],
    ["unfamiliar", "new-runtime.js", Buffer.from("globalThis.RUNTIME.push([]);")],
  ]) {
    await t.test(name, async () => {
      await withFixture({
        chunks: { [filename]: bytes },
        html: `<script src="/_next/static/chunks/${filename}"></script>`,
      }, async (buildDir) => {
        const result = await inspectInitialBundleBoundary(buildDir);
        assert.equal(result.moduleSyntax, "UNSUPPORTED");
        assert.equal(result.runtimeProvenance, "NEEDS_EMISSION_REVIEW");
        await assert.rejects(() => verifyInitialBundleBoundary(buildDir), /NQR_BUNDLE_NEEDS_EMISSION_REVIEW/);
      });
    });
  }
});

test("handles inline scripts, inert data and MIME modes conservatively", async (t) => {
  const cases = [
    ["literal inline", `${MODULE_ROOT}<script>void 0;</script>`, "PASS_CLOSED_STATIC_SUBSET"],
    ["call inline", `${MODULE_ROOT}<script>start()</script>`, "UNSUPPORTED"],
    ["import inline", `${MODULE_ROOT}<script type="module">import "./a.js"</script>`, "UNSUPPORTED"],
    ["import map", `${MODULE_ROOT}<script type="importmap">{}</script>`, "UNSUPPORTED"],
    ["unknown type", `${MODULE_ROOT}<script type="text/x-code">void 0</script>`, "UNSUPPORTED"],
    ["inert JSON", `${MODULE_ROOT}<script type="application/ld+json">{"x":1}</script>`, "PASS_CLOSED_STATIC_SUBSET"],
  ];
  for (const [name, html, expected] of cases) {
    await t.test(name, async () => {
      await withFixture({ html, chunks: { "shell.js": "export const ok=true;", "a.js": "void 0;" } }, async (buildDir) => {
        assert.equal((await inspectInitialBundleBoundary(buildDir)).moduleSyntax, expected);
      });
    });
  }
});

test("uses tag-specific script src and link href without cross-tag fallback", async (t) => {
  await t.test("script href does not mask inline call or marker", async () => {
    await withFixture({
      chunks: { "a.js": "void 0;" },
      html: '<script href="/_next/static/chunks/a.js">start(); void "jsPDF";</script>',
    }, async (buildDir) => {
      const result = await inspectInitialBundleBoundary(buildDir);
      assert.equal(result.assetChecks, "FAIL");
      assert.equal(result.moduleSyntax, "UNSUPPORTED");
      assert.deepEqual(result.evidence.assets, []);
      assert.equal(readCount(result, "/_next/static/chunks/a.js"), 0);
      assert.ok(codes(result).includes("FORBIDDEN_INITIAL_MARKER"));
      await assert.rejects(() => verifyInitialBundleBoundary(buildDir), (error) =>
        error.code === "NQR_BUNDLE_STATIC_CHECK_FAILED");
    });
  });
  await t.test("link src does not mask its heavy href", async () => {
    await withFixture({
      chunks: { "shell.js": "void 0;", "a.js": "void 0;", "heavy.js": 'void "jsPDF";' },
      html: `${MODULE_ROOT}<link rel="modulepreload" src="/_next/static/chunks/a.js"
        href="/_next/static/chunks/heavy.js">`,
    }, async (buildDir) => {
      const result = await inspectInitialBundleBoundary(buildDir);
      assert.equal(result.assetChecks, "FAIL");
      assert.deepEqual(result.evidence.assets.map(({ path }) => path), [
        "/_next/static/chunks/heavy.js", "/_next/static/chunks/shell.js",
      ]);
      assert.equal(readCount(result, "/_next/static/chunks/heavy.js"), 1);
      assert.equal(readCount(result, "/_next/static/chunks/a.js"), 0);
      await assert.rejects(() => verifyInitialBundleBoundary(buildDir), (error) =>
        error.code === "NQR_BUNDLE_STATIC_CHECK_FAILED");
    });
  });
  await t.test("hostile link href is refused even when src looks supported", async () => {
    await withFixture({
      chunks: { "shell.js": "void 0;" },
      html: `${MODULE_ROOT}<link rel="modulepreload" src="/_next/static/chunks/shell.js"
        href="https://private-marker.invalid/heavy.js">`,
    }, async (buildDir) => {
      const result = await inspectInitialBundleBoundary(buildDir);
      assert.equal(result.assetChecks, "FAIL");
      assert.ok(codes(result).includes("UNSUPPORTED_ASSET_URL"));
      assert.ok(!JSON.stringify(result.evidence.diagnostics).includes("private-marker"));
      await assert.rejects(() => verifyInitialBundleBoundary(buildDir), (error) =>
        error.code === "NQR_BUNDLE_NEEDS_EMISSION_REVIEW");
    });
  });
});

test("selects supported rel tokens with ASCII-whitespace and case semantics", async (t) => {
  const supported = [
    ["leading and trailing", " modulepreload ", null],
    ["multiple with modulepreload", "prefetch modulepreload", null],
    ["uppercase", "MODULEPRELOAD", null],
    ["ASCII tab newline formfeed carriage return", "prefetch\t\n\f\rmodulepreload", null],
    ["classic preload plus extra", "preload stylesheet", "script"],
    ["classic uppercase", "PRELOAD", "SCRIPT"],
    ["modulepreload plus inactive preload", "modulepreload preload", null],
  ];
  for (const [name, rel, as] of supported) {
    await t.test(name, async () => {
      const asAttribute = as == null ? "" : ` as="${as}"`;
      await withFixture({
        chunks: { "shell.js": "void 0;", "heavy.js": 'void "jsPDF";' },
        html: `${MODULE_ROOT}<link rel="${rel}"${asAttribute} href="/_next/static/chunks/heavy.js">`,
      }, async (buildDir) => {
        const result = await inspectInitialBundleBoundary(buildDir);
        assert.equal(result.assetChecks, "FAIL");
        assert.equal(result.evidence.entries.length, 44);
        assert.equal(readCount(result, "/_next/static/chunks/heavy.js"), 1);
        await assert.rejects(() => verifyInitialBundleBoundary(buildDir), (error) =>
          error.code === "NQR_BUNDLE_STATIC_CHECK_FAILED");
      });
    });
  }
  await t.test("conflicting module and classic preload modes are explicit unsupported", async () => {
    await withFixture({
      chunks: { "shell.js": "void 0;", "heavy.js": 'void "jsPDF";' },
      html: `${MODULE_ROOT}<link rel="modulepreload preload" as="script"
        href="/_next/static/chunks/heavy.js">`,
    }, async (buildDir) => {
      const result = await inspectInitialBundleBoundary(buildDir);
      assert.equal(result.assetChecks, "UNSUPPORTED");
      assert.equal(result.moduleSyntax, "UNSUPPORTED");
      assert.equal(result.evidence.entries.length, 44);
      assert.ok(codes(result).includes("UNSUPPORTED_LINK_MODE"));
      assert.equal(readCount(result, "/_next/static/chunks/heavy.js"), 0);
      await assert.rejects(() => verifyInitialBundleBoundary(buildDir), (error) =>
        error.code === "NQR_BUNDLE_NEEDS_EMISSION_REVIEW");
    });
  });
});

test("counts tokenized supported links toward the per-route entry limit", async () => {
  const tokenized = '<link rel="prefetch modulepreload" href="/_next/static/chunks/shell.js">';
  await withFixture({ html: `${MODULE_ROOT}${tokenized.repeat(511)}` }, async (buildDir) => {
    assert.ok(!codes(await inspectInitialBundleBoundary(buildDir)).includes("UNSUPPORTED_RESOURCE_LIMIT"));
  });
  await withFixture({ html: `${MODULE_ROOT}${tokenized.repeat(512)}` }, async (buildDir) => {
    assert.ok(codes(await inspectInitialBundleBoundary(buildDir)).includes("UNSUPPORTED_RESOURCE_LIMIT"));
  });
});

test("requires exact absence of import and export attribute clauses", async (t) => {
  for (const [name, source] of [
    ["empty import", 'import "./a.js" with {};'],
    ["nonempty import", 'import "./a.js" with { type: "json" };'],
    ["empty export", 'export * from "./a.js" with {};'],
    ["nonempty export", 'export * from "./a.js" with { type: "json" };'],
  ]) {
    await t.test(name, async () => {
      const result = await inspectSource(source, { chunks: { "a.js": 'void "jsPDF";' } });
      assert.equal(result.assetChecks, "UNSUPPORTED");
      assert.equal(result.moduleSyntax, "UNSUPPORTED");
      assert.equal(readCount(result, "/_next/static/chunks/a.js"), 0);
      assert.equal(result.evidence.staticEdges.length, 0);
      assert.ok(codes(result).includes("UNSUPPORTED_EXECUTABLE_FORM"));
      await withFixture({ chunks: { "shell.js": source, "a.js": 'void "jsPDF";' } }, async (buildDir) => {
        await assert.rejects(() => verifyInitialBundleBoundary(buildDir), (error) =>
          error.code === "NQR_BUNDLE_NEEDS_EMISSION_REVIEW");
      });
    });
  }
  for (const [name, source] of [
    ["plain import ASI", 'import "./a.js"\n'],
    ["commented import", 'import /* before */ "./a.js" /* after */;'],
    ["plain export ASI", 'export * from "./a.js"\n'],
    ["commented export", 'export /* one */ * /* two */ from /* three */ "./a.js" /* four */;'],
  ]) {
    await t.test(name, async () => {
      const result = await inspectSource(source, { chunks: { "a.js": "void 0;" } });
      assert.equal(result.assetChecks, "PASS");
      assert.equal(result.moduleSyntax, "PASS_CLOSED_STATIC_SUBSET");
      assert.equal(readCount(result, "/_next/static/chunks/a.js"), 1);
    });
  }
});

test("keeps jsdom parser output private without expanding into CSS analysis", async (t) => {
  for (const [name, style] of [
    ["harmless style", "body{color:black}"],
    ["malformed relative import", '@import "NQR_PRIVATE_CSS_MARKER";'],
  ]) {
    await t.test(name, async () => {
      await withFixture({ html: `${MODULE_ROOT}<style>${style}</style>` }, async (buildDir) => {
        const captured = [];
        const methods = ["error", "warn", "log", "info", "debug"];
        const saved = Object.fromEntries(methods.map((method) => [method, console[method]]));
        for (const method of methods) console[method] = (...args) => captured.push([method, ...args]);
        let result;
        try {
          result = await inspectInitialBundleBoundary(buildDir);
        } finally {
          for (const method of methods) console[method] = saved[method];
        }
        assert.equal(captured.length, 0);
        assert.ok(!JSON.stringify(result).includes("NQR_PRIVATE_CSS_MARKER"));
        assert.equal(result.assetChecks, "PASS");
        assert.equal(result.moduleSyntax, "PASS_CLOSED_STATIC_SUBSET");
        await assert.rejects(() => verifyInitialBundleBoundary(buildDir), (error) =>
          error.code === "NQR_BUNDLE_NEEDS_EMISSION_REVIEW");
      });
    });
  }
});

test("rejects classic module syntax and mixed module/classic identity", async (t) => {
  await t.test("classic module syntax", async () => {
    const result = await inspectSource('import "./a.js";', { html: CLASSIC_ROOT, chunks: { "a.js": "void 0;" } });
    assert.equal(result.moduleSyntax, "UNSUPPORTED");
  });
  await t.test("mixed mode", async () => {
    await withFixture({ html: `${CLASSIC_ROOT}${MODULE_ROOT}` }, async (buildDir) => {
      const result = await inspectInitialBundleBoundary(buildDir);
      assert.ok(codes(result).includes("UNSUPPORTED_MIXED_SCRIPT_MODE"));
      assert.equal(result.moduleSyntax, "UNSUPPORTED");
    });
  });
});

test("inventories modulepreload and script preload modes", async () => {
  await withFixture({
    chunks: { "shell.js": "export const ok=true;", "module.js": "export const m=true;", "classic.js": "void 0;" },
    html: `${MODULE_ROOT}<link rel="modulepreload" href="/_next/static/chunks/module.js?v=1">
      <link rel="preload" as="script" href="/_next/static/chunks/classic.js#x">`,
  }, async (buildDir) => {
    const result = await inspectInitialBundleBoundary(buildDir);
    assert.equal(result.assetChecks, "PASS");
    assert.equal(result.evidence.entries.filter(({ kind }) => kind === "preload").length, 44);
    assert.ok(result.evidence.entries.some(({ mode, alias }) =>
      mode === "module" && alias === "/_next/static/chunks/module.js?v=1"));
    assert.ok(result.evidence.entries.some(({ mode, alias }) =>
      mode === "classic" && alias === "/_next/static/chunks/classic.js#x"));
  });
});

test("rejects unsupported static specifier spellings without following them", async (t) => {
  for (const [name, source] of [
    ["parent", 'import "../heavy.js";'],
    ["encoded", 'import "./%2e%2e/heavy.js";'],
    ["bare", 'import "renderer-package";'],
    ["query", 'import "./heavy.js?eager=1";'],
    ["backslash", 'import ".\\\\heavy.js";'],
  ]) {
    await t.test(name, async () => {
      const result = await inspectSource(source, { chunks: { "heavy.js": 'void "jsPDF";' } });
      assert.ok(codes(result).includes("UNSUPPORTED_STATIC_SPECIFIER"));
      assert.deepEqual(result.evidence.assets.map(({ path }) => path), ["/_next/static/chunks/shell.js"]);
    });
  }
});

test("rejects unsafe root URLs with fixed diagnostics", async (t) => {
  const roots = [
    "https://example.invalid/x.js", "//example.invalid/x.js", "/assets/x.js",
    "/_next/static/chunks/%2e%2e/x.js", "/_next/static/chunks/../x.js",
    "/_next/static/chunks/a\\x.js", "/_next/static/chunks/x.js%00",
    "/_next/static/chunks/", " /_next/static/chunks/x.js",
  ];
  for (const [index, src] of roots.entries()) {
    await t.test(String(index), async () => {
      await withFixture({ chunks: {}, html: `<script src="${src}"></script>` }, async (buildDir) => {
        const result = await inspectInitialBundleBoundary(buildDir);
        assert.equal(result.assetChecks, "FAIL");
        assert.ok(codes(result).includes("UNSUPPORTED_ASSET_URL"));
      });
    });
  }
});

test("fails fixed route/file/identity guards", async (t) => {
  await t.test("missing route", async () => {
    await withFixture({ setup: async ({ buildDir }) => rm(join(buildDir, "server/app/th.html")) }, async (buildDir) => {
      assert.ok(codes(await inspectInitialBundleBoundary(buildDir)).includes("UNREADABLE_REQUIRED_FILE"));
    });
  });
  await t.test("missing asset", async () => {
    await withFixture({ chunks: {}, html: MODULE_ROOT }, async (buildDir) => {
      assert.ok(codes(await inspectInitialBundleBoundary(buildDir)).includes("MISSING_DECLARED_ASSET"));
    });
  });
  await t.test("symlink escape", async () => {
    await withFixture({ chunks: {}, setup: async ({ buildDir }) =>
      symlink(join(buildDir, "server/app/th.html"), join(buildDir, "static/chunks/shell.js")) }, async (buildDir) => {
      assert.ok(codes(await inspectInitialBundleBoundary(buildDir)).includes("ASSET_PATH_ESCAPE"));
    });
  });
  await t.test("HTML symlink escape", async () => {
    await withFixture({ setup: async ({ buildDir, root }) => {
      const routePath = join(buildDir, "server/app/th.html");
      const outside = join(root, "outside.html");
      await writeFile(outside, MODULE_ROOT);
      await rm(routePath);
      await symlink(outside, routePath);
    } }, async (buildDir) => {
      assert.ok(codes(await inspectInitialBundleBoundary(buildDir)).includes("HTML_PATH_ESCAPE"));
    });
  });
  await t.test("directory", async () => {
    await withFixture({ chunks: {}, setup: async ({ buildDir }) =>
      mkdir(join(buildDir, "static/chunks/shell.js")) }, async (buildDir) => {
      assert.ok(codes(await inspectInitialBundleBoundary(buildDir)).includes("UNSUPPORTED_NON_REGULAR_FILE"));
    });
  });
});

test("enforces exact resource limits at boundary and excess", async (t) => {
  assert.deepEqual(INSPECTION_LIMITS, {
    htmlFiles: 22, entriesPerRoute: 512, jsFiles: 256,
    bytesPerFile: 8 * 1024 * 1024, totalBytes: 64 * 1024 * 1024,
  });
  await t.test("512 entries accepted", async () => {
    await withFixture({ html: MODULE_ROOT.repeat(512) }, async (buildDir) => {
      assert.ok(!codes(await inspectInitialBundleBoundary(buildDir)).includes("UNSUPPORTED_RESOURCE_LIMIT"));
    });
  });
  await t.test("513 entries rejected", async () => {
    await withFixture({ html: MODULE_ROOT.repeat(513) }, async (buildDir) => {
      assert.ok(codes(await inspectInitialBundleBoundary(buildDir)).includes("UNSUPPORTED_RESOURCE_LIMIT"));
    });
  });
  await t.test("256 files accepted and 257 rejected", async () => {
    const chunks = {};
    const imports = [];
    for (let i = 1; i < 256; i += 1) {
      chunks[`c${i}.js`] = "export const ok=true;";
      imports.push(`import "./c${i}.js";`);
    }
    chunks["shell.js"] = imports.join("");
    await withFixture({ chunks }, async (buildDir) => {
      const result = await inspectInitialBundleBoundary(buildDir);
      assert.equal(result.evidence.assets.length, 256);
      assert.ok(!codes(result).includes("UNSUPPORTED_RESOURCE_LIMIT"));
    });
    chunks["c256.js"] = "void 0;";
    chunks["shell.js"] += 'import "./c256.js";';
    await withFixture({ chunks }, async (buildDir) => {
      assert.ok(codes(await inspectInitialBundleBoundary(buildDir)).includes("UNSUPPORTED_RESOURCE_LIMIT"));
    });
  });
  await t.test("8 MiB accepted and one-byte excess rejected", async () => {
    const exact = Buffer.alloc(INSPECTION_LIMITS.bytesPerFile, 32);
    exact.write("void 0;/*", 0);
    exact.write("*/", exact.length - 2);
    await withFixture({ chunks: { "shell.js": exact } }, async (buildDir) => {
      assert.ok(!codes(await inspectInitialBundleBoundary(buildDir)).includes("UNSUPPORTED_RESOURCE_LIMIT"));
    });
    await withFixture({ chunks: { "shell.js": Buffer.concat([exact, Buffer.from(" ")]) } }, async (buildDir) => {
      assert.ok(codes(await inspectInitialBundleBoundary(buildDir)).includes("UNSUPPORTED_RESOURCE_LIMIT"));
    });
  });
  await t.test("64 MiB cumulative boundary accepted and one-byte excess rejected", async () => {
    const htmlBytes = Buffer.byteLength(MODULE_ROOT) * routePaths.length;
    const imports = Array.from({ length: 7 }, (_, index) => `import "./c${index}.js";`).join("");
    const chunks = { "shell.js": paddedProgram(INSPECTION_LIMITS.bytesPerFile, imports) };
    for (let index = 0; index < 6; index += 1) {
      chunks[`c${index}.js`] = paddedProgram(INSPECTION_LIMITS.bytesPerFile);
    }
    const finalSize = INSPECTION_LIMITS.totalBytes - htmlBytes - (7 * INSPECTION_LIMITS.bytesPerFile);
    chunks["c6.js"] = paddedProgram(finalSize);
    await withFixture({ chunks }, async (buildDir) => {
      const result = await inspectInitialBundleBoundary(buildDir);
      assert.equal(result.evidence.totalBytes, INSPECTION_LIMITS.totalBytes);
      assert.ok(!codes(result).includes("UNSUPPORTED_RESOURCE_LIMIT"));
    });
    chunks["c6.js"] = paddedProgram(finalSize + 1);
    await withFixture({ chunks }, async (buildDir) => {
      const result = await inspectInitialBundleBoundary(buildDir);
      assert.ok(codes(result).includes("UNSUPPORTED_RESOURCE_LIMIT"));
      assert.equal(result.assetChecks, "UNSUPPORTED");
    });
  });
});

test("static evidence changes with bytes and graph and never scans unreferenced chunks", async () => {
  await withFixture({
    chunks: { "shell.js": 'import "./a.js";', "a.js": "export const v=1;", "b.js": 'void "jsPDF";' },
  }, async (buildDir) => {
    const first = await inspectInitialBundleBoundary(buildDir);
    await writeFile(join(buildDir, "static/chunks/a.js"), "export const v=2;");
    const second = await inspectInitialBundleBoundary(buildDir);
    assert.notEqual(first.evidence.assetManifestSha256, second.evidence.assetManifestSha256);
    assert.ok(!JSON.stringify(second).includes("b.js"));
    await writeFile(join(buildDir, "static/chunks/shell.js"), 'import "./b.js";');
    const third = await inspectInitialBundleBoundary(buildDir);
    assert.ok(third.evidence.staticEdges.some(({ to }) => to.endsWith("/b.js")));
    assert.equal(third.assetChecks, "FAIL");
  });
});

test("refuses an input whose observable file identity changes during inspection", async () => {
  await withFixture({ chunks: { "shell.js": paddedProgram(INSPECTION_LIMITS.bytesPerFile) } }, async (buildDir) => {
    const target = join(buildDir, "static/chunks/shell.js");
    const mutator = spawn(process.execPath, ["-e", `
      const fs=require("node:fs");const target=process.argv[1];
      process.stdout.write("ready\\n");const end=Date.now()+2000;
      while(Date.now()<end){const now=new Date();fs.utimesSync(target,now,now)}
    `, target], { stdio: ["ignore", "pipe", "inherit"] });
    await new Promise((resolve, reject) => {
      mutator.stdout.once("data", resolve);
      mutator.once("error", reject);
    });
    let observed = false;
    while (!observed && mutator.exitCode == null) {
      const result = await inspectInitialBundleBoundary(buildDir);
      observed = codes(result).includes("CHANGED_INPUT_DURING_INSPECTION");
    }
    await new Promise((resolve) => mutator.exitCode == null ? mutator.once("exit", resolve) : resolve());
    assert.equal(observed, true);
  });
});

test("cycles deduplicate and missing static leaves remain fixed failures", async () => {
  await withFixture({ chunks: { "shell.js": 'import "./a.js";', "a.js": 'export * from "./shell.js";' } }, async (buildDir) => {
    const result = await inspectInitialBundleBoundary(buildDir);
    assert.equal(result.evidence.assets.length, 2);
    assert.equal(result.evidence.staticEdges.length, 2);
  });
  const missing = await inspectSource('import "./missing.js";');
  assert.ok(codes(missing).includes("MISSING_DECLARED_ASSET"));
});

test("diagnostics never echo hostile source or caught filesystem detail", async () => {
  const secret = "NQR_DO_NOT_ECHO_SECRET_8729";
  const malformed = await inspectSource(`function ${secret}(`);
  assert.ok(!JSON.stringify(malformed.evidence.diagnostics).includes(secret));
  await withFixture({ chunks: {}, html: MODULE_ROOT }, async (buildDir) => {
    const result = await inspectInitialBundleBoundary(buildDir);
    assert.ok(!JSON.stringify(result.evidence.diagnostics).includes(buildDir));
  });
});

test("stubbed build caller uses the real always-reject wrapper on a narrow positive", async () => {
  await withFixture({ chunks: { "shell.js": "void 0;" } }, async (buildDir) => {
    const original = await readFile(new URL("./build.mjs", import.meta.url), "utf8");
    const harness = original
      .replace('import { spawnSync } from "node:child_process";', "const spawnSync=globalThis.__nqrSpawnSync;")
      .replace('import { createRequire } from "node:module";', 'const createRequire=()=>({resolve:()=>"/not-executed-next"});')
      .replace('import { assertBuildOrigin } from "./origin-gate.mjs";', "const assertBuildOrigin=()=>null;")
      .replaceAll('await import("./verify-initial-bundle-boundary.mjs")', "await globalThis.__nqrVerifierModule()");
    assert.notEqual(harness, original);
    const previousExitCode = process.exitCode;
    const errors = [];
    const previousError = console.error;
    let spawnCalls = 0;
    let wrapperCalls = 0;
    globalThis.__nqrSpawnSync = () => { spawnCalls += 1; return { status: 0 }; };
    globalThis.__nqrVerifierModule = async () => ({
      verifyInitialBundleBoundary: async () => {
        wrapperCalls += 1;
        return verifyInitialBundleBoundary(buildDir);
      },
    });
    console.error = (...args) => errors.push(args.join(" "));
    try {
      await import(`data:text/javascript;base64,${Buffer.from(harness).toString("base64")}#${Date.now()}`);
      assert.equal(process.exitCode, 1);
      assert.equal(spawnCalls, 1);
      assert.equal(wrapperCalls, 1);
      assert.deepEqual(errors, ["NQR_BUNDLE_NEEDS_EMISSION_REVIEW"]);
    } finally {
      process.exitCode = previousExitCode;
      console.error = previousError;
      delete globalThis.__nqrSpawnSync;
      delete globalThis.__nqrVerifierModule;
    }
  });
});

// ---- Stage B: conditional bundle-scope decision and verify-existing wrapper -----------------------------

const STAGE_B_ORIGIN = "https://nqr.orenvis.com";
const STAGE_B_WIRE = '1:I[7,["/_next/static/chunks/entry.js"],"default"]\n';
const stageBHash = (value) => createHash("sha256").update(value).digest("hex");
const asciiOrder = (a, b) => Buffer.from(a).compare(Buffer.from(b));
const stageBRegistration = (id, factory = "t=>{}") =>
  `(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,${id},${factory}]);`;
const STAGE_B_MODULES = ["inspect-turbopack-emission.mjs", "verify-initial-bundle-boundary.mjs", "build.mjs",
  "origin-gate.mjs", "verify-origin-artifacts.mjs"];
const EMPTY_ADMISSION = /^export const ADMITTED_ACCEPTANCE_SHA256 = Object\.freeze\(\[\]\);$/gm;

async function stageBRows(directory, prefix = "", rows = []) {
  for (const name of (await readdir(directory)).sort(asciiOrder)) {
    const path = join(directory, name);
    const relativePath = prefix ? `${prefix}/${name}` : name;
    if ((await lstat(path)).isDirectory()) await stageBRows(path, relativePath, rows);
    else {
      const bytes = await readFile(path);
      rows.push({ sha256: stageBHash(bytes), path: relativePath, size: bytes.length, type: "file" });
    }
  }
  return rows;
}

async function stageBExpectedInputs(root) {
  const full = await stageBRows(root);
  const scope = full.filter((row) => row.path === "BUILD_ID" || row.path.startsWith("server/app/")
    || row.path.startsWith("static/")).sort((a, b) => asciiOrder(a.path, b.path));
  return {
    buildId: "stage-b-build",
    sourceInventorySha256: SUPPORTED_PROFILE.sourceInventorySha256,
    dependencySha256: SUPPORTED_PROFILE.dependencySha256,
    nextPackageSha256: SUPPORTED_PROFILE.nextPackageSha256,
    parserSha256: SUPPORTED_PROFILE.parserSha256,
    artifactFull: { count: full.length, canonicalSha256: stageBHash(JSON.stringify(full)), rows: full },
    artifactScope: { count: scope.length, canonicalSha256: stageBHash(JSON.stringify(scope)), rows: scope },
  };
}

function stageBAlternates(suffix) {
  return ["th", "en", "x-default"].map((language) =>
    `${STAGE_B_ORIGIN}/${language === "x-default" ? "th" : language}${suffix}`);
}

// Origin-valid, adapter-supported synthetic HTML so the real verify-existing CLI can reach PASS.
function stageBHtml(route, wire, extraBody) {
  const locale = route.split("/")[1];
  const suffix = route.slice(locale.length + 1);
  const alternates = stageBAlternates(suffix).map((href, index) =>
    `<link rel="alternate" hreflang="${["th", "en", "x-default"][index]}" href="${href}">`).join("");
  const jsonLd = suffix
    ? `<script type="application/ld+json">${JSON.stringify({ "@type": "SoftwareApplication", url: STAGE_B_ORIGIN + route,
      publisher: { url: `${STAGE_B_ORIGIN}/${locale}` } })}</script><script type="application/ld+json">${JSON.stringify({
      "@type": "BreadcrumbList", itemListElement: [{ item: `${STAGE_B_ORIGIN}/${locale}` }, { item: STAGE_B_ORIGIN + route }] })}</script>`
    : "";
  return '<!doctype html><html><head><script src="/_next/static/chunks/entry.js" async=""></script>'
    + `<link rel="canonical" href="${STAGE_B_ORIGIN}${route}"><meta property="og:url" content="${STAGE_B_ORIGIN}${route}">`
    + `${alternates}${jsonLd}</head><body><script>(self.__next_f=self.__next_f||[]).push([0])</script>`
    + `<script>self.__next_f.push([1,${JSON.stringify(wire)}])</script>${extraBody}</body></html>`;
}

async function withStageBArtifact({ entry = stageBRegistration(7), wire = STAGE_B_WIRE, extraBody = "", extraFiles = {} } = {},
  callback) {
  const base = await mkdtemp(join(await realpath(tmpdir()), "nqr-stage-b-"));
  const root = join(base, "artifact");
  try {
    await mkdir(join(root, "static/chunks"), { recursive: true });
    await writeFile(join(root, "BUILD_ID"), "stage-b-build\n");
    for (const route of routePaths) {
      const path = join(root, "server/app", `${route.slice(1)}.html`);
      await mkdir(join(path, ".."), { recursive: true });
      await writeFile(path, stageBHtml(route, wire, extraBody));
    }
    await writeFile(join(root, "server/app/sitemap.xml.body"), '<?xml version="1.0" encoding="UTF-8"?>'
      + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'
      + routePaths.map((route) => `<url><loc>${STAGE_B_ORIGIN}${route}</loc>${stageBAlternates(route.slice(3)).map((href, index) =>
        `<xhtml:link rel="alternate" hreflang="${["th", "en", "x-default"][index]}" href="${href}"/>`).join("")}</url>`).join("")
      + "</urlset>");
    await writeFile(join(root, "server/app/robots.txt.body"), `User-agent: *\nAllow: /\nSitemap: ${STAGE_B_ORIGIN}/sitemap.xml\n`);
    await writeFile(join(root, "static/chunks/entry.js"), entry);
    for (const [path, bytes] of Object.entries(extraFiles)) await writeFile(join(root, path), bytes);
    return await callback({ base, root, expectedInputs: await stageBExpectedInputs(root) });
  } finally {
    await rm(base, { recursive: true, force: true });
  }
}

// Synthetic records exist only to exercise predicates; the shipped admission set never contains them.
function stageBRecordObject(expectedInputs, gateRevision, startupPaths = ["static/chunks/entry.js"]) {
  const full = expectedInputs.artifactFull.canonicalSha256;
  const rows = new Map(expectedInputs.artifactFull.rows.map((row) => [row.path, row.sha256]));
  return {
    schemaVersion: 1,
    policyVersion: SUPPORTED_PROFILE.policyVersion,
    profileId: SUPPORTED_PROFILE.profileId,
    productionOrigin: STAGE_B_ORIGIN,
    expectedInputs,
    gateRevision,
    startupChunks: startupPaths.map((path) => ({ path, sha256: rows.get(path) })),
    timingEvidence: {
      schemaVersion: 1,
      policyVersion: SUPPORTED_PROFILE.policyVersion,
      buildId: expectedInputs.buildId,
      artifactFullSha256: full,
      artifactScopeSha256: expectedInputs.artifactScope.canonicalSha256,
      browser: { name: "SyntheticBrowser", version: "0" },
      collectedAt: { start: "2026-09-17T00:00:00.000Z", end: "2026-09-17T01:00:00.000Z" },
      localOrigin: "http://127.0.0.1:3100",
      evidenceBundleSha256: stageBHash("synthetic-evidence-bundle"),
      scenarios: REQUIRED_TIMING_SCENARIOS.map((id) => ({
        id,
        observationsSha256: stageBHash(`synthetic-observations-${id}`),
        postIdentitySha256: full,
        preIdentitySha256: full,
        routes: [...TIMING_SCENARIO_ROUTES[id]],
        state: id === "WARM_REPETITION" ? "warm" : "cold",
        status: "PASS",
      })),
    },
    reviews: ["QA", "SECURITY", "TL"].map((role) => ({
      disposition: "ACCEPT",
      reportSha256: stageBHash(`synthetic-${role}`),
      reviewedGateRevisionSha256: stageBHash(JSON.stringify(gateRevision)),
      role,
    })),
  };
}

function stageBRecord(expectedInputs, gateRevision, change = (record) => record, startupPaths = undefined) {
  return Buffer.from(JSON.stringify(change(structuredClone(stageBRecordObject(expectedInputs, gateRevision, startupPaths)))));
}

// Real on-disk admission: copies the gate modules, writes the digests into the copied verifier file and imports it
// through its file URL. Nothing is rewritten in memory, so the gate revision is computed from the running bytes.
async function withAdmittedGate(recordBytes, callback, { declaration, importGate = true, nested = false } = {}) {
  // nested puts the copy one level below a private folder so tests can plant files in folders Node searches.
  const outer = await mkdtemp(join(await realpath(tmpdir()), "nqr-stage-b-admitted-"));
  const base = nested ? join(outer, "gate") : outer;
  try {
    if (nested) await mkdir(base);
    await mkdir(join(base, "scripts"));
    for (const name of STAGE_B_MODULES) {
      let source = await readFile(new URL(`./${name}`, import.meta.url), "utf8");
      if (name === "verify-initial-bundle-boundary.mjs") {
        assert.equal(source.match(EMPTY_ADMISSION)?.length, 1);
        const admitted = declaration ?? `export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([${
          recordBytes.map((bytes) => `\n  ${JSON.stringify(stageBHash(bytes))},`).join("")}\n]);`;
        source = source.replace(EMPTY_ADMISSION, () => admitted);
      }
      await writeFile(join(base, "scripts", name), source);
    }
    await symlink(await realpath(fileURLToPath(new URL("../node_modules", import.meta.url))), join(base, "node_modules"));
    const gate = importGate ? await import(pathToFileURL(join(base, "scripts/verify-initial-bundle-boundary.mjs")).href) : null;
    return await callback({ base, outer, gate, buildScript: join(base, "scripts/build.mjs") });
  } finally {
    await rm(outer, { recursive: true, force: true });
  }
}

async function stageBStartupScan(root, inspection) {
  const scan = [];
  for (const path of startupReachableChunks(inspection)) {
    const bytes = await readFile(join(root, path));
    scan.push({ markers: FORBIDDEN_INITIAL_MARKERS.filter((marker) => bytes.includes(Buffer.from(marker))), path,
      sha256: stageBHash(bytes) });
  }
  return scan;
}

async function stageBInputs({ root, expectedInputs }, acceptanceBytes) {
  const inspection = await inspectTurbopackEmission({ artifactRoot: root, expectedInputs, profile: SUPPORTED_PROFILE });
  return {
    acceptanceBytes,
    gateRevision: await readGateRevision(),
    inspection,
    legacyInspection: await inspectInitialBundleBoundary(root),
    origin: STAGE_B_ORIGIN,
    startupScan: await stageBStartupScan(root, inspection),
  };
}

async function rejection(promise) {
  try {
    await promise;
  } catch (error) {
    return { code: error.code, reasonCodes: [...(error.reasonCodes || [])], name: error.name };
  }
  return { code: "RESOLVED" };
}

function runVerifyExisting(buildScript, item, acceptancePath, env = { NEXT_PUBLIC_APP_URL: STAGE_B_ORIGIN }, execArgv = []) {
  return spawnSync(process.execPath, [...execArgv, buildScript, "--verify-existing", "--artifact", item.root,
    "--acceptance", acceptancePath], { encoding: "utf8", env: { PATH: process.env.PATH, ...env }, timeout: 30000 });
}

test("stage B: a complete self-authored acceptance record stays blocked and unadmitted bytes are never parsed", async () => {
  assert.ok(Object.isFrozen(ADMITTED_ACCEPTANCE_SHA256));
  assert.deepEqual(ADMITTED_ACCEPTANCE_SHA256, []);
  await withStageBArtifact({}, async (item) => {
    const record = stageBRecord(item.expectedInputs, await readGateRevision());
    const acceptancePath = join(item.base, "acceptance.json");
    await writeFile(acceptancePath, record);
    assert.deepEqual(await rejection(verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN })),
      { code: "NQR_BUNDLE_NEEDS_EMISSION_REVIEW", reasonCodes: ["ACCEPTANCE_NOT_ADMITTED"], name: "BundleBoundaryError" });
    await writeFile(acceptancePath, Buffer.from([0xff, 0xfe, 0x7b]));
    assert.deepEqual((await rejection(verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN }))).reasonCodes,
      ["ACCEPTANCE_NOT_ADMITTED"]);
    const inputs = await stageBInputs(item, record);
    assert.deepEqual(evaluateBundleBoundary(inputs),
      { status: "BLOCKED", reasonCodes: ["ACCEPTANCE_NOT_ADMITTED"], identity: null, policyVersion: SUPPORTED_PROFILE.policyVersion });
    assert.deepEqual(evaluateBundleBoundary({ ...inputs, admittedAcceptanceSha256: [stageBHash(record)] }).reasonCodes,
      ["INVALID_DECISION_INPUT"]);
  });
});

test("stage B: on-disk admission reaches PASS through the real CLI and admitting never changes the gate revision", async () => {
  await withStageBArtifact({}, async (item) => {
    const revision = await readGateRevision();
    const record = stageBRecord(item.expectedInputs, revision);
    await withAdmittedGate([record], async ({ base, gate, buildScript }) => {
      assert.deepEqual(await gate.readGateRevision(), revision);
      assert.notEqual(stageBHash(await readFile(join(base, "scripts/verify-initial-bundle-boundary.mjs"))),
        stageBHash(await readFile(new URL("./verify-initial-bundle-boundary.mjs", import.meta.url))));
      const acceptancePath = join(item.base, "acceptance.json");
      await writeFile(acceptancePath, record);
      const decision = await gate.verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN });
      assert.equal(decision.status, "PASS_BUNDLE_SCOPE");
      assert.deepEqual(decision.reasonCodes, []);
      assert.equal(decision.identity.artifactFullSha256, item.expectedInputs.artifactFull.canonicalSha256);

      const passed = runVerifyExisting(buildScript, item, acceptancePath);
      assert.equal(passed.status, 0, passed.stderr);
      assert.match(passed.stdout, /\[verify-existing\] bundle and origin scopes PASS/);
      assert.doesNotMatch(passed.stdout + passed.stderr, /Creating an optimized|Next\.js/);

      const flagged = runVerifyExisting(buildScript, item, acceptancePath, { NEXT_PUBLIC_APP_URL: STAGE_B_ORIGIN }, ["--no-warnings"]);
      assert.equal(flagged.status, 1);
      assert.match(flagged.stderr, /^NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME$/m);
      for (const nodeOptions of ["--import=data:text/javascript,0", '"--import=data:text/javascript,0"',
        '"--require=/dev/null"', "--max-old-space-size=256"]) {
        const preloaded = runVerifyExisting(buildScript, item, acceptancePath, { NEXT_PUBLIC_APP_URL: STAGE_B_ORIGIN, NODE_OPTIONS: nodeOptions });
        assert.equal(preloaded.status, 1, nodeOptions);
        assert.match(preloaded.stderr, /^NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME$/m, nodeOptions);
      }
      for (const [name, value] of [["LD_PRELOAD", "/nonexistent/preload.so"], ["DYLD_NQR_STAGE_B_UNUSED", "1"],
        ["NODE_PATH", "/nonexistent"], ["HOME", "/nonexistent"], ["NQR_UNLISTED", "1"]]) {
        const injected = runVerifyExisting(buildScript, item, acceptancePath, { NEXT_PUBLIC_APP_URL: STAGE_B_ORIGIN, [name]: value });
        assert.equal(injected.status, 1, name);
        assert.match(injected.stderr, /^NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME$/m, name);
      }

      const linkedDirectory = join(item.base, "linked");
      await symlink(item.base, linkedDirectory);
      for (const [options, reasons] of [
        [{ acceptancePath: join(linkedDirectory, "acceptance.json"), origin: STAGE_B_ORIGIN }, ["UNREADABLE_ACCEPTANCE_RECORD"]],
        [{ acceptancePath: "acceptance.json", origin: STAGE_B_ORIGIN }, ["INVALID_VERIFY_OPTIONS"]],
        [{ acceptancePath, origin: STAGE_B_ORIGIN, approved: true }, ["INVALID_VERIFY_OPTIONS"]],
        [{ acceptancePath }, ["INVALID_VERIFY_OPTIONS"]],
        [null, ["INVALID_VERIFY_OPTIONS"]],
        [Object.defineProperty({ origin: STAGE_B_ORIGIN }, "acceptancePath", { enumerable: true, get: () => acceptancePath }),
          ["INVALID_VERIFY_OPTIONS"]],
        [{ acceptancePath, origin: "https://other.example" }, ["ORIGIN_NOT_BOUND"]],
      ]) {
        assert.deepEqual((await rejection(gate.verifyInitialBundleBoundary(item.root, options))).reasonCodes, reasons,
          JSON.stringify(options));
      }
      assert.deepEqual((await rejection(gate.verifyInitialBundleBoundary(".next", { acceptancePath, origin: STAGE_B_ORIGIN })))
        .reasonCodes, ["INVALID_VERIFY_OPTIONS"]);

      await writeFile(join(item.root, "static/chunks/entry.js"), `${stageBRegistration(7)} `);
      const changed = runVerifyExisting(buildScript, item, acceptancePath);
      assert.equal(changed.status, 1);
      assert.match(changed.stderr, /^NQR_BUNDLE_NEEDS_EMISSION_REVIEW\nreasons: .*ADAPTER_STATIC_UNKNOWN/m);
      assert.doesNotMatch(changed.stderr, /\/private|\/Users|artifact\//);
    });
  });
});

test("stage B: proven markers FAIL even when the record is missing, unadmitted or invalid", async () => {
  await withStageBArtifact({ entry: `${stageBRegistration(7)}/*jsPDF*/` }, async (item) => {
    const acceptancePath = join(item.base, "acceptance.json");
    assert.deepEqual(await rejection(verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN })),
      { code: "NQR_BUNDLE_STATIC_CHECK_FAILED", reasonCodes: ["FORBIDDEN_INITIAL_MARKER", "UNREADABLE_ACCEPTANCE_RECORD"],
        name: "BundleBoundaryError" });
    const record = stageBRecord(item.expectedInputs, await readGateRevision());
    await writeFile(acceptancePath, record);
    assert.deepEqual((await rejection(verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN }))),
      { code: "NQR_BUNDLE_STATIC_CHECK_FAILED", reasonCodes: ["ACCEPTANCE_NOT_ADMITTED", "FORBIDDEN_INITIAL_MARKER"],
        name: "BundleBoundaryError" });
    const pretty = Buffer.from(JSON.stringify(stageBRecordObject(item.expectedInputs, await readGateRevision()), null, 2));
    await withAdmittedGate([pretty], async ({ gate }) => {
      await writeFile(acceptancePath, pretty);
      assert.deepEqual(await rejection(gate.verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN })),
        { code: "NQR_BUNDLE_STATIC_CHECK_FAILED",
          reasonCodes: ["FORBIDDEN_INITIAL_MARKER", "INVALID_ACCEPTANCE_RECORD"], name: "BundleBoundaryError" });
    });
  });
});

test("stage B: markers in Flight-preloaded startup chunks FAIL while deferred loads stay allowed", async () => {
  const eagerWire = `${STAGE_B_WIRE}2:I[9,["/_next/static/chunks/pdf.js"],"default"]\n`;
  await withStageBArtifact({ wire: eagerWire, extraFiles: { "static/chunks/pdf.js": `${stageBRegistration(9)}/*jsPDF*/` } },
    async (item) => {
      const legacy = await inspectInitialBundleBoundary(item.root);
      assert.ok(!legacy.evidence.diagnostics.some(({ code }) => code === "FORBIDDEN_INITIAL_MARKER"));
      const record = stageBRecord(item.expectedInputs, await readGateRevision(), undefined,
        ["static/chunks/entry.js", "static/chunks/pdf.js"]);
      await withAdmittedGate([record], async ({ gate }) => {
        const acceptancePath = join(item.base, "acceptance.json");
        await writeFile(acceptancePath, record);
        assert.deepEqual(await rejection(gate.verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN })),
          { code: "NQR_BUNDLE_STATIC_CHECK_FAILED", reasonCodes: ["FORBIDDEN_STARTUP_MARKER"], name: "BundleBoundaryError" });
      });
    });
  const deferredEntry = stageBRegistration(7,
    't=>{t.v(l=>Promise.all(["static/chunks/pdf.js"].map(x=>t.l(x))).then(()=>l(9)))}');
  await withStageBArtifact({ entry: deferredEntry, extraFiles: { "static/chunks/pdf.js": `${stageBRegistration(9)}/*jsPDF*/` } },
    async (item) => {
      const record = stageBRecord(item.expectedInputs, await readGateRevision());
      await withAdmittedGate([record], async ({ gate }) => {
        const acceptancePath = join(item.base, "acceptance.json");
        await writeFile(acceptancePath, record);
        const decision = await gate.verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN });
        assert.equal(decision.status, "PASS_BUNDLE_SCOPE");
        assert.deepEqual(gate.startupReachableChunks(await inspectTurbopackEmission({
          artifactRoot: item.root, expectedInputs: item.expectedInputs, profile: SUPPORTED_PROFILE })), ["static/chunks/entry.js"]);
      });
    });
});

test("stage B: every decision predicate has an isolated exact-reason negative", async () => {
  await withStageBArtifact({}, async (item) => {
    const revision = await readGateRevision();
    const scenario = (record, id) => record.timingEvidence.scenarios.find((entry) => entry.id === id);
    const variants = {
      base: [(record) => record, "PASS_BUNDLE_SCOPE", []],
      missingScenario: [(record) => { record.timingEvidence.scenarios.pop(); return record; }, "BLOCKED", ["TIMING_EVIDENCE_INCOMPLETE"]],
      failedScenario: [(record) => { scenario(record, "FIRST_ELIGIBLE_PDF_REQUEST").status = "FAIL"; return record; }, "FAIL",
        ["TIMING_POLICY_VIOLATION"]],
      unverifiedScenario: [(record) => { scenario(record, "NON_PDF_ACTIONS").status = "UNVERIFIED"; return record; }, "BLOCKED",
        ["TIMING_EVIDENCE_INCOMPLETE"]],
      warmColdSwap: [(record) => { scenario(record, "WARM_REPETITION").state = "cold"; return record; }, "BLOCKED",
        ["TIMING_EVIDENCE_INCOMPLETE"]],
      duplicateScenario: [(record) => { record.timingEvidence.scenarios.push({ ...record.timingEvidence.scenarios[0] }); return record; },
        "BLOCKED", ["TIMING_EVIDENCE_INCOMPLETE"]],
      pdfOnlyLanding: [(record) => { scenario(record, "FIRST_ELIGIBLE_PDF_REQUEST").routes = ["/th"]; return record; }, "BLOCKED",
        ["TIMING_EVIDENCE_INCOMPLETE"]],
      pdfIncludesLandings: [(record) => {
        scenario(record, "FIRST_ELIGIBLE_PDF_REQUEST").routes = [...TIMING_SCENARIO_ROUTES.COLD_EMPTY_INVALID_STARTUP];
        return record;
      }, "BLOCKED", ["TIMING_EVIDENCE_INCOMPLETE"]],
      duplicateRoute: [(record) => { const entry = scenario(record, "NON_PDF_ACTIONS"); entry.routes[1] = entry.routes[0]; return record; },
        "BLOCKED", ["TIMING_EVIDENCE_INCOMPLETE"]],
      routeOutsideProfile: [(record) => { scenario(record, "WARM_REPETITION").routes[0] = "/fr"; return record; }, "BLOCKED",
        ["TIMING_EVIDENCE_INCOMPLETE"]],
      observationsNotDigest: [(record) => { scenario(record, "NON_PDF_ACTIONS").observationsSha256 = "x"; return record; }, "BLOCKED",
        ["TIMING_EVIDENCE_INCOMPLETE"]],
      timingBuildMismatch: [(record) => { record.timingEvidence.buildId = "other-build"; return record; }, "BLOCKED",
        ["TIMING_EVIDENCE_IDENTITY_MISMATCH"]],
      timingScopeMismatch: [(record) => { record.timingEvidence.artifactScopeSha256 = "3".repeat(64); return record; }, "BLOCKED",
        ["TIMING_EVIDENCE_IDENTITY_MISMATCH"]],
      timingFullMismatch: [(record) => { record.timingEvidence.artifactFullSha256 = "4".repeat(64); return record; }, "BLOCKED",
        ["TIMING_EVIDENCE_IDENTITY_MISMATCH"]],
      preIdentityMismatch: [(record) => { scenario(record, "COLD_EMPTY_INVALID_STARTUP").preIdentitySha256 = "5".repeat(64); return record; },
        "BLOCKED", ["TIMING_EVIDENCE_IDENTITY_MISMATCH"]],
      postIdentityMismatch: [(record) => { scenario(record, "WARM_REPETITION").postIdentitySha256 = "6".repeat(64); return record; },
        "BLOCKED", ["TIMING_EVIDENCE_IDENTITY_MISMATCH"]],
      timingPolicy: [(record) => { record.timingEvidence.policyVersion = "OTHER"; return record; }, "BLOCKED", ["INVALID_TIMING_EVIDENCE"]],
      browserEmpty: [(record) => { record.timingEvidence.browser.name = ""; return record; }, "BLOCKED", ["INVALID_TIMING_EVIDENCE"]],
      publicLocalOrigin: [(record) => { record.timingEvidence.localOrigin = STAGE_B_ORIGIN; return record; }, "BLOCKED",
        ["INVALID_TIMING_EVIDENCE"]],
      reversedCollection: [(record) => { record.timingEvidence.collectedAt.end = "2026-09-16T00:00:00.000Z"; return record; }, "BLOCKED",
        ["INVALID_TIMING_EVIDENCE"]],
      impossibleDate: [(record) => { record.timingEvidence.collectedAt.start = "2026-02-30T00:00:00.000Z"; return record; }, "BLOCKED",
        ["INVALID_TIMING_EVIDENCE"]],
      nonIsoDate: [(record) => { record.timingEvidence.collectedAt.start = "2026-09-17 00:00:00"; return record; }, "BLOCKED",
        ["INVALID_TIMING_EVIDENCE"]],
      browserVersionEmpty: [(record) => { record.timingEvidence.browser.version = ""; return record; }, "BLOCKED",
        ["INVALID_TIMING_EVIDENCE"]],
      localOriginPortTooHigh: [(record) => { record.timingEvidence.localOrigin = "http://127.0.0.1:99999"; return record; }, "BLOCKED",
        ["INVALID_TIMING_EVIDENCE"]],
      startupNotAttested: [(record) => { record.startupChunks = []; return record; }, "BLOCKED", ["STARTUP_CHUNKS_NOT_ATTESTED"]],
      startupAttestedOtherBytes: [(record) => { record.startupChunks[0].sha256 = "9".repeat(64); return record; }, "BLOCKED",
        ["STARTUP_CHUNKS_NOT_ATTESTED"]],
      evidenceBundleNotDigest: [(record) => { record.timingEvidence.evidenceBundleSha256 = "bundle"; return record; }, "BLOCKED",
        ["INVALID_TIMING_EVIDENCE"]],
      rejectedSecurity: [(record) => { record.reviews[1].disposition = "REQUEST_CHANGES"; return record; }, "BLOCKED", ["REVIEW_NOT_ACCEPTED"]],
      missingQa: [(record) => { record.reviews.shift(); return record; }, "BLOCKED", ["REVIEW_NOT_ACCEPTED"]],
      duplicateTl: [(record) => { record.reviews.push({ ...record.reviews[2] }); return record; }, "BLOCKED", ["REVIEW_NOT_ACCEPTED"]],
      reviewReportNotDigest: [(record) => { record.reviews[0].reportSha256 = "report"; return record; }, "BLOCKED", ["REVIEW_NOT_ACCEPTED"]],
      reviewOtherRevision: [(record) => { record.reviews[2].reviewedGateRevisionSha256 = "7".repeat(64); return record; }, "BLOCKED",
        ["REVIEW_NOT_ACCEPTED"]],
      selfApprovalField: [(record) => ({ ...record, approved: true }), "BLOCKED", ["INVALID_ACCEPTANCE_RECORD"]],
      wrongProfile: [(record) => { record.profileId = "OTHER"; return record; }, "BLOCKED", ["INVALID_ACCEPTANCE_RECORD"]],
      wrongPolicy: [(record) => { record.policyVersion = "OTHER"; return record; }, "BLOCKED", ["INVALID_ACCEPTANCE_RECORD"]],
      identityMismatch: [(record) => { record.expectedInputs.buildId = "other-build"; return record; }, "BLOCKED",
        ["ACCEPTANCE_IDENTITY_MISMATCH"]],
      staleGate: [(record) => { record.gateRevision.adapterSha256 = "0".repeat(64); return record; }, "BLOCKED", ["GATE_REVISION_MISMATCH"]],
      originMismatch: [(record) => { record.productionOrigin = "https://other.example"; return record; }, "BLOCKED", ["ORIGIN_NOT_BOUND"]],
    };
    const records = Object.fromEntries(Object.entries(variants)
      .map(([name, [change]]) => [name, stageBRecord(item.expectedInputs, revision, change)]));
    const base = records.base.toString("utf8");
    records.duplicateKey = Buffer.from(base.replace('"schemaVersion":1,', '"schemaVersion":2,"schemaVersion":1,'));
    records.prettyPrinted = Buffer.from(JSON.stringify(JSON.parse(base), null, 1));
    assert.notEqual(records.duplicateKey.toString(), base);
    await withAdmittedGate(Object.values(records), async ({ gate }) => {
      const inputs = await stageBInputs(item, records.base);
      const evaluate = (changes = {}) => gate.evaluateBundleBoundary({ ...inputs, ...changes });
      const expectDecision = (label, result, status, reasonCodes) => {
        assert.equal(result.status, status, `${label}: ${JSON.stringify(result)}`);
        assert.deepEqual(result.reasonCodes, reasonCodes, label);
      };
      for (const [name, [, status, reasons]] of Object.entries(variants)) {
        expectDecision(name, evaluate({ acceptanceBytes: records[name] }), status, reasons);
      }
      expectDecision("duplicateKey", evaluate({ acceptanceBytes: records.duplicateKey }), "BLOCKED", ["INVALID_ACCEPTANCE_RECORD"]);
      expectDecision("prettyPrinted", evaluate({ acceptanceBytes: records.prettyPrinted }), "BLOCKED", ["INVALID_ACCEPTANCE_RECORD"]);

      const legacy = inputs.legacyInspection;
      const legacyWith = (evidence) => ({ ...legacy, evidence: { ...legacy.evidence, ...evidence } });
      const inspection = inputs.inspection;
      const cases = [
        ["adapterViolation", { inspection: { ...inspection, staticStatus: "STATIC_VIOLATION" } }, "FAIL", ["ADAPTER_STATIC_VIOLATION"]],
        ["adapterUnknown", { inspection: { ...inspection, staticStatus: "STATIC_UNKNOWN" } }, "BLOCKED", ["ADAPTER_STATIC_UNKNOWN"]],
        ["adapterReleasePass", { inspection: { ...inspection, releaseDecision: "PASS" } }, "BLOCKED", ["INVALID_ADAPTER_INSPECTION"]],
        ["adapterProfile", { inspection: { ...inspection, profileId: "OTHER" } }, "BLOCKED", ["INVALID_ADAPTER_INSPECTION"]],
        ["adapterIdentityMissing", { inspection: { ...inspection, identity: { ...inspection.identity, buildId: null } } }, "BLOCKED",
          ["ACCEPTANCE_IDENTITY_MISMATCH", "INCOMPLETE_ARTIFACT_IDENTITY", "TIMING_EVIDENCE_IDENTITY_MISMATCH"]],
        ["gateRevision", { gateRevision: { ...inputs.gateRevision, verifierLogicSha256: "1".repeat(64) } }, "BLOCKED",
          ["GATE_REVISION_MISMATCH", "REVIEW_NOT_ACCEPTED"]],
        ["origin", { origin: "https://other.example" }, "BLOCKED", ["ORIGIN_NOT_BOUND"]],
        ["legacyMarker", { legacyInspection: legacyWith({ diagnostics: [...legacy.evidence.diagnostics,
          { code: "FORBIDDEN_INITIAL_MARKER", subject: "x" }] }) }, "FAIL", ["FORBIDDEN_INITIAL_MARKER"]],
        ["legacyResourceLimit", { legacyInspection: legacyWith({ diagnostics: [...legacy.evidence.diagnostics,
          { code: "UNSUPPORTED_RESOURCE_LIMIT", subject: "x" }] }) }, "BLOCKED", ["LEGACY_INSPECTION_INCOMPLETE"]],
        ["legacyShape", { legacyInspection: { ...legacy, releaseDecision: "PASS" } }, "BLOCKED", ["INVALID_LEGACY_INSPECTION"]],
        ["legacyBytes", { legacyInspection: legacyWith({ inputManifest: { ...legacy.evidence.inputManifest,
          files: legacy.evidence.inputManifest.files.map((file, index) => index ? file : { ...file, sha256: "2".repeat(64) }) } }) },
          "BLOCKED", ["LEGACY_INSPECTION_IDENTITY_MISMATCH"]],
        ["startupMarker", { startupScan: inputs.startupScan.map((entry) => ({ ...entry, markers: ["jsPDF"] })) }, "FAIL",
          ["FORBIDDEN_STARTUP_MARKER"]],
        ["startupMissing", { startupScan: [] }, "BLOCKED", ["STARTUP_SCAN_INCOMPLETE"]],
        ["startupBytes", { startupScan: inputs.startupScan.map((entry) => ({ ...entry, sha256: "8".repeat(64) })) }, "BLOCKED",
          ["STARTUP_CHUNKS_NOT_ATTESTED", "STARTUP_SCAN_IDENTITY_MISMATCH"]],
        ["startupUnreadable", { startupScan: inputs.startupScan.map((entry) => ({ ...entry, sha256: null })) }, "BLOCKED",
          ["STARTUP_CHUNKS_NOT_ATTESTED", "STARTUP_SCAN_IDENTITY_MISMATCH"]],
        ["unknownWithStartupMarker", { inspection: { ...inspection, staticStatus: "STATIC_UNKNOWN" },
          startupScan: inputs.startupScan.map((entry) => ({ ...entry, markers: ["jsPDF"] })) }, "FAIL",
          ["ADAPTER_STATIC_UNKNOWN", "FORBIDDEN_STARTUP_MARKER"]],
        ["notBytes", { acceptanceBytes: "not-bytes" }, "BLOCKED", ["MISSING_ACCEPTANCE_RECORD"]],
        ["oversized", { acceptanceBytes: Buffer.alloc(12 * 1024 * 1024 + 1) }, "BLOCKED", ["ACCEPTANCE_RESOURCE_LIMIT"]],
        ["unadmittedWithUnknown", { acceptanceBytes: Buffer.from("{}"), inspection: { ...inspection, staticStatus: "STATIC_UNKNOWN" } },
          "BLOCKED", ["ACCEPTANCE_NOT_ADMITTED", "ADAPTER_STATIC_UNKNOWN"]],
        ["unadmittedWithMarker", { acceptanceBytes: Buffer.from("{}"), legacyInspection: legacyWith({ diagnostics: [
          { code: "FORBIDDEN_INITIAL_MARKER", subject: "x" }] }) }, "FAIL", ["ACCEPTANCE_NOT_ADMITTED", "FORBIDDEN_INITIAL_MARKER"]],
      ];
      for (const [label, changes, status, reasons] of cases) expectDecision(label, evaluate(changes), status, reasons);
      expectDecision("violationNotHidden", evaluate({ acceptanceBytes: records.failedScenario, origin: "https://other.example" }),
        "FAIL", ["ORIGIN_NOT_BOUND", "TIMING_POLICY_VIOLATION"]);
      for (const hostile of [null, "x", [], new Proxy({}, { ownKeys() { throw new Error("NQR_STAGE_B_MARKER"); } })]) {
        const result = gate.evaluateBundleBoundary(hostile);
        assert.deepEqual(result.reasonCodes, ["INVALID_DECISION_INPUT"]);
        assert.ok(!JSON.stringify(result).includes("NQR_STAGE_B_MARKER"));
      }
    });
  });
});

test("stage B: each legacy closed-grammar class closes only through a supported adapter inspection", async () => {
  assert.deepEqual(Object.keys(LEGACY_CLOSURE).sort(), ["UNSUPPORTED_EXECUTABLE_FORM", "UNSUPPORTED_LINK_MODE",
    "UNSUPPORTED_MIXED_SCRIPT_MODE", "UNSUPPORTED_SCRIPT_TYPE", "UNSUPPORTED_STATIC_SPECIFIER"]);
  await withStageBArtifact({}, async (item) => {
    const record = stageBRecord(item.expectedInputs, await readGateRevision());
    await withAdmittedGate([record], async ({ gate }) => {
      const inputs = await stageBInputs(item, record);
      for (const code of Object.keys(LEGACY_CLOSURE)) {
        const legacyInspection = { ...inputs.legacyInspection, evidence: { ...inputs.legacyInspection.evidence,
          diagnostics: [{ code, subject: "x" }] } };
        assert.equal(gate.evaluateBundleBoundary({ ...inputs, legacyInspection }).status, "PASS_BUNDLE_SCOPE", code);
        assert.deepEqual(gate.evaluateBundleBoundary({ ...inputs, legacyInspection,
          inspection: { ...inputs.inspection, staticStatus: "STATIC_UNKNOWN" } }).reasonCodes, ["ADAPTER_STATIC_UNKNOWN"], code);
      }
    });
  });
});

test("stage B: startup reachability follows roots, Flight preloads and static imports but not deferred loads", () => {
  const edge = (kind, from, to, condition) => ({ kind, from, to, ...(condition ? { condition } : {}) });
  const inspection = { graph: { edges: [
    edge("synchronous-instantiation", "static/chunks/import-a.js", "static/chunks/import-b.js"),
    edge("synchronous-instantiation", "static/chunks/root.js", "static/chunks/import-a.js"),
    edge("synchronous-instantiation", "route:/th", "static/chunks/root.js", "SCRIPT_ROOT"),
    edge("synchronous-instantiation", "route:/th", "static/chunks/preload.js", "PRELOAD_DECLARATION"),
    edge("flight-resolve-preload", "inline:th:1", "static/chunks/flight.js"),
    edge("synchronous-instantiation", "inline:th:2", "static/chunks/inline-import.js"),
    edge("explicit-chunk-load", "thunk:static/chunks/root.js:7", "static/chunks/deferred.js", "DEFERRED_INVOCATION"),
    edge("synchronous-instantiation", "static/chunks/deferred.js", "static/chunks/deferred-import.js"),
    edge("synchronous-instantiation", "thunk:static/chunks/root.js:7", "module:9", "AFTER_CHUNK_LOAD"),
    edge("synchronous-instantiation", "inline:th:1", "module:7", "FLIGHT_IMPORT"),
    edge("synchronous-instantiation", "route:/th", "static/chunks/unlisted.js", "OTHER_CONDITION"),
  ] } };
  assert.deepEqual(startupReachableChunks(inspection), ["static/chunks/flight.js", "static/chunks/import-a.js",
    "static/chunks/import-b.js", "static/chunks/inline-import.js", "static/chunks/preload.js", "static/chunks/root.js"]);
  assert.deepEqual(startupReachableChunks({}), []);
});

test("stage B: the admission list is data only; code, loose spelling or a second declaration blocks", async () => {
  await withStageBArtifact({}, async (item) => {
    const record = stageBRecord(item.expectedInputs, await readGateRevision());
    const digest = stageBHash(record);
    const acceptancePath = join(item.base, "acceptance.json");
    await writeFile(acceptancePath, record);
    // The verify-existing environment allowlist refuses extra variables, so no variant can read one at runtime.
    const env = { NEXT_PUBLIC_APP_URL: STAGE_B_ORIGIN };
    const control = `export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([\n  "${digest}",\n]);`;
    const declarations = {
      control,
      environment: "export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([process.env.NQR_STAGE_B_ADMIT]);",
      prototypePatch: `export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([(() => { Set.prototype.has = () => true; return "${digest}"; })()]);`,
      mixedEntry: `export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([\n  "${digest}",\n  process.env.PATH,\n]);`,
      looseSpacing: `export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([ "${digest}" ]);`,
      secondDeclaration: `${control}\n/*\nexport const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([]);\n*/`,
      secondStatement: `${control}\n/*\nexport const ADMITTED_ACCEPTANCE_SHA256 = unreviewed;\n*/`,
      // The only strict-form declaration is an inert comment; the running list comes from code on another line.
      commentDecoy: `const nqrStageBDecoy = 0; export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze(["${digest}"]);\n`
        + "/*\nexport const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([]);\n*/",
    };
    for (const [name, declaration] of Object.entries(declarations)) {
      await withAdmittedGate([record], async ({ buildScript }) => {
        const result = runVerifyExisting(buildScript, item, acceptancePath, env);
        if (name === "control") {
          assert.equal(result.status, 0, result.stderr);
        } else if (name === "environment") {
          assert.equal(result.status, 1, name);
          assert.match(result.stderr, /^NQR_BUNDLE_NEEDS_EMISSION_REVIEW\nreasons: ACCEPTANCE_NOT_ADMITTED$/m, name);
        } else {
          assert.equal(result.status, 1, name);
          // A prototype patch also disturbs other checks; what matters is that the unreadable revision blocks.
          assert.match(result.stderr, /^NQR_BUNDLE_NEEDS_EMISSION_REVIEW\nreasons: (?:[A-Z_]+,)*UNREADABLE_GATE_REVISION(?:,[A-Z_]+)*$/m, name);
        }
      }, { declaration, importGate: false });
    }
  });
});

test("stage B: an admitted record still FAILs an eager PDF preload while a runtime chunk keeps the adapter UNKNOWN", async () => {
  const wire = `${STAGE_B_WIRE}2:I[9,["/_next/static/chunks/pdf.js"],"default"]\n`;
  await withStageBArtifact({ wire, extraFiles: { "static/chunks/pdf.js": `${stageBRegistration(9)}/*jsPDF*/`,
    "static/chunks/turbopack-runtime.js": stageBRegistration(11) } }, async (item) => {
    const record = stageBRecord(item.expectedInputs, await readGateRevision(), undefined,
      ["static/chunks/entry.js", "static/chunks/pdf.js"]);
    await withAdmittedGate([record], async ({ gate, buildScript }) => {
      const acceptancePath = join(item.base, "acceptance.json");
      await writeFile(acceptancePath, record);
      assert.deepEqual(await rejection(gate.verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN })),
        { code: "NQR_BUNDLE_STATIC_CHECK_FAILED", reasonCodes: ["ADAPTER_STATIC_UNKNOWN", "FORBIDDEN_STARTUP_MARKER"],
          name: "BundleBoundaryError" });
      const cli = runVerifyExisting(buildScript, item, acceptancePath);
      assert.equal(cli.status, 1);
      assert.match(cli.stderr, /^NQR_BUNDLE_STATIC_CHECK_FAILED\nreasons: ADAPTER_STATIC_UNKNOWN,FORBIDDEN_STARTUP_MARKER$/m);
    });
  });
});

test("stage B: an acceptance record that changes while it is read is not admitted", async () => {
  await withStageBArtifact({}, async (item) => {
    const record = stageBRecord(item.expectedInputs, await readGateRevision());
    await withAdmittedGate([record], async ({ gate }) => {
      const acceptancePath = join(item.base, "acceptance.json");
      await writeFile(acceptancePath, record);
      const originalOpen = fs.open;
      fs.open = async function openDuringReview(path, ...args) {
        const handle = await originalOpen.call(this, path, ...args);
        if (path !== acceptancePath) return handle;
        return {
          stat: (...options) => handle.stat(...options),
          close: () => handle.close(),
          read: async (...options) => {
            const result = await handle.read(...options);
            await appendFile(acceptancePath, " ");
            return result;
          },
        };
      };
      syncBuiltinESMExports();
      let result;
      try {
        result = await rejection(gate.verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN }));
      } finally {
        fs.open = originalOpen;
        syncBuiltinESMExports();
      }
      assert.deepEqual(result.reasonCodes, ["UNREADABLE_ACCEPTANCE_RECORD"]);
    });
  });
});

test("stage B: admission uses the lookup captured at load, not a later prototype change", async () => {
  await withStageBArtifact({}, async (item) => {
    const inputs = await stageBInputs(item, stageBRecord(item.expectedInputs, await readGateRevision()));
    const originalIncludes = Array.prototype.includes;
    const originalHas = Set.prototype.has;
    let decision;
    try {
      Array.prototype.includes = function alwaysIncluded() { return true; };
      Set.prototype.has = function alwaysPresent() { return true; };
      decision = evaluateBundleBoundary(inputs);
    } finally {
      Array.prototype.includes = originalIncludes;
      Set.prototype.has = originalHas;
    }
    assert.ok(decision.reasonCodes.includes("ACCEPTANCE_NOT_ADMITTED"), JSON.stringify(decision));
    assert.notEqual(decision.status, "PASS_BUNDLE_SCOPE");
  });
});

test("stage B: verify-existing refuses unpinned or shadowing dependency code before loading it", async () => {
  await withStageBArtifact({}, async (item) => {
    const record = stageBRecord(item.expectedInputs, await readGateRevision());
    await withAdmittedGate([record], async ({ base, outer, buildScript }) => {
      const acceptancePath = join(item.base, "acceptance.json");
      await writeFile(acceptancePath, record);
      const installed = await realpath(join(base, "node_modules"));
      const linkAllExcept = async (directory, copied) => {
        for (const name of await readdir(installed)) {
          if (!copied.includes(name)) await symlink(join(installed, name), join(directory, name));
        }
      };
      await rm(join(base, "node_modules"));
      await mkdir(join(base, "node_modules"));
      await linkAllExcept(join(base, "node_modules"), ["jsdom", "symbol-tree"]);
      await cp(join(installed, "jsdom"), join(base, "node_modules/jsdom"), { recursive: true });
      await cp(join(installed, "symbol-tree"), join(base, "node_modules/symbol-tree"), { recursive: true });
      const run = (env = {}) => runVerifyExisting(buildScript, item, acceptancePath, { NEXT_PUBLIC_APP_URL: STAGE_B_ORIGIN, ...env });
      const expectMismatch = (label) => {
        const result = run();
        assert.equal(result.status, 1, label);
        assert.match(result.stderr, /^NQR_VERIFY_EXISTING_DEPENDENCY_MISMATCH$/m, label);
        assert.doesNotMatch(result.stdout + result.stderr, /\[verify-existing\]|NQR_BUNDLE/, label);
      };
      assert.equal(run().status, 0, "intact copies");

      for (const [name, value] of [["NODE_PATH", join(outer, "node_modules")], ["HOME", outer], ["NQR_UNLISTED", "1"]]) {
        const result = run({ [name]: value });
        assert.equal(result.status, 1, name);
        assert.match(result.stderr, /^NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME$/m, name);
      }

      // jsdom tries require("canvas"); an optional peer planted in a parent folder Node searches must be caught.
      await mkdir(join(outer, "node_modules/canvas"), { recursive: true });
      await writeFile(join(outer, "node_modules/canvas/package.json"), '{"name":"canvas","version":"0.0.0"}');
      expectMismatch("parent-folder canvas");
      await rm(join(outer, "node_modules"), { recursive: true });

      // Forms Node loads without a package.json: CommonJS file lookups and directory index/ESM folder resolution.
      for (const [label, path, cleanup] of [
        ["parent-folder extensionless canvas file", join(outer, "node_modules/canvas"), join(outer, "node_modules")],
        ["parent-folder canvas.js", join(outer, "node_modules/canvas.js"), join(outer, "node_modules")],
        ["parent-folder canvas/index.js without package.json", join(outer, "node_modules/canvas/index.js"), join(outer, "node_modules")],
        ["project node_modules/canvas.js", join(base, "node_modules/canvas.js"), join(base, "node_modules/canvas.js")],
        ["file beside an installed package", join(base, "node_modules/symbol-tree.js"), join(base, "node_modules/symbol-tree.js")],
        ["scripts/node_modules/jsdom without package.json", join(base, "scripts/node_modules/jsdom/index.js"), join(base, "scripts/node_modules")],
      ]) {
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, "module.exports = {};\n");
        expectMismatch(label);
        await rm(cleanup, { recursive: true });
      }

      // A shadow package where Node resolves the gate's own imports from scripts/.
      await cp(join(installed, "parse5"), join(base, "scripts/node_modules/parse5"), { recursive: true });
      await appendFile(join(base, "scripts/node_modules/parse5/package.json"), "\n");
      expectMismatch("scripts/node_modules shadow");
      await rm(join(base, "scripts/node_modules"), { recursive: true });

      // A shim in a node_modules directory below a package root.
      await mkdir(join(base, "node_modules/jsdom/lib/node_modules/symbol-tree"), { recursive: true });
      await writeFile(join(base, "node_modules/jsdom/lib/node_modules/symbol-tree/package.json"), '{"name":"symbol-tree","version":"3.2.4"}');
      expectMismatch("nested node_modules shim");
      await rm(join(base, "node_modules/jsdom/lib/node_modules"), { recursive: true });

      // An undeclared package next to a package root would be found first by any require of that name.
      await mkdir(join(base, "node_modules/jsdom/node_modules/nqr-undeclared"), { recursive: true });
      await writeFile(join(base, "node_modules/jsdom/node_modules/nqr-undeclared/package.json"), '{"name":"nqr-undeclared","version":"0.0.0"}');
      expectMismatch("undeclared package at a package root");
      await rm(join(base, "node_modules/jsdom/node_modules/nqr-undeclared"), { recursive: true });

      await symlink("api.js", join(base, "node_modules/jsdom/lib/nqr-link.js"));
      expectMismatch("symlink inside a package");
      await rm(join(base, "node_modules/jsdom/lib/nqr-link.js"));
      assert.equal(run().status, 0, "restored copies");

      // A symlinked package directory: Node resolves its dependencies from the real path, where a sibling is tampered.
      const elsewhere = join(outer, "elsewhere/node_modules");
      await mkdir(elsewhere, { recursive: true });
      await linkAllExcept(elsewhere, ["jsdom", "symbol-tree"]);
      await cp(join(base, "node_modules/jsdom"), join(elsewhere, "jsdom"), { recursive: true });
      await cp(join(installed, "symbol-tree"), join(elsewhere, "symbol-tree"), { recursive: true });
      await appendFile(join(elsewhere, "symbol-tree/lib/SymbolTree.js"), "\n// unreviewed change\n");
      await rm(join(base, "node_modules/jsdom"), { recursive: true });
      await symlink(join(elsewhere, "jsdom"), join(base, "node_modules/jsdom"));
      expectMismatch("symlinked package with a tampered sibling");
      await rm(join(base, "node_modules/jsdom"));
      await cp(join(elsewhere, "jsdom"), join(base, "node_modules/jsdom"), { recursive: true });

      // A package scope above scripts/ named like a pinned package wins through ESM/CommonJS self-reference.
      await writeFile(join(base, "scripts/package.json"), '{"name":"nqr-scripts-scope"}');
      assert.equal(run().status, 0, "unrelated scripts/package.json");
      await writeFile(join(base, "scripts/package.json"), '{"name":"jsdom","exports":"./jsdom-self.mjs"}');
      await writeFile(join(base, "scripts/jsdom-self.mjs"), 'export * from "../node_modules/jsdom/lib/api.js";\n');
      expectMismatch("self-referencing scripts/package.json");
      await rm(join(base, "scripts/package.json"));
      await rm(join(base, "scripts/jsdom-self.mjs"));

      // A partially pinned package: the required subpath must resolve to the hashed acorn.js, not an earlier candidate.
      await rm(join(base, "node_modules/next"));
      await mkdir(join(base, "node_modules/next/dist/compiled"), { recursive: true });
      await cp(join(installed, "next/package.json"), join(base, "node_modules/next/package.json"));
      await cp(join(installed, "next/dist/compiled/acorn"), join(base, "node_modules/next/dist/compiled/acorn"), { recursive: true });
      assert.equal(run().status, 0, "minimal next copy");
      await writeFile(join(base, "node_modules/next/dist/compiled/acorn/acorn"), "module.exports = {};\n");
      expectMismatch("extensionless file ahead of the pinned acorn.js");
      await rm(join(base, "node_modules/next/dist/compiled/acorn/acorn"));

      await appendFile(join(base, "node_modules/jsdom/lib/api.js"), "\n// unreviewed change\n");
      expectMismatch("tampered package file");

      // Print mode reports a fixed code, not a filesystem error with an absolute path, when a pinned file is missing.
      await rm(join(base, "node_modules/next/dist"), { recursive: true });
      const printed = spawnSync(process.execPath, [buildScript, "--print-dependency-digest"],
        { encoding: "utf8", env: { PATH: process.env.PATH }, timeout: 30000 });
      assert.equal(printed.status, 1);
      assert.match(printed.stderr, /^NQR_VERIFY_EXISTING_DEPENDENCY_MISMATCH\n$/);
      assert.doesNotMatch(printed.stderr, /ENOENT|\//);
    }, { nested: true, importGate: false });
  });
});

test("stage B: the pinned dependency digest matches the installed tree and is printed only in a clean runtime", async () => {
  const script = fileURLToPath(new URL("./build.mjs", import.meta.url));
  const pinned = /sha256: "([a-f0-9]{64})",\n\}\);/.exec(await readFile(new URL("./build.mjs", import.meta.url), "utf8"))?.[1];
  const printed = spawnSync(process.execPath, [script, "--print-dependency-digest"],
    { encoding: "utf8", env: { PATH: process.env.PATH }, timeout: 30000 });
  assert.equal(printed.status, 0, printed.stderr);
  assert.equal(printed.stdout.trim(), pinned, "Installed jsdom/parse5/entities/next bytes differ from VERIFY_EXISTING_DEPENDENCIES; "
    + "check the changed tree against the lockfile/registry integrity from a separate process, then re-pin with "
    + "`env -i PATH=\"$PATH\" node scripts/build.mjs --print-dependency-digest`.");
  const refused = spawnSync(process.execPath, [script, "--print-dependency-digest"],
    { encoding: "utf8", env: { PATH: process.env.PATH, NODE_PATH: "/nonexistent" }, timeout: 30000 });
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /^NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME$/m);
});

test("stage B: every bare specifier the gate files load is covered by the dependency pin", async () => {
  const acorn = createRequire(import.meta.url)("next/dist/compiled/acorn/acorn");
  const parse = async (name) => acorn.parse(await readFile(new URL(`./${name}`, import.meta.url), "utf8"),
    { ecmaVersion: "latest", sourceType: "module" });
  const visit = (node, callback) => {
    if (!node || typeof node.type !== "string") return;
    callback(node);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach((child) => visit(child, callback));
      else if (value && typeof value === "object") visit(value, callback);
    }
  };
  const unfreeze = (node) => (node?.type === "CallExpression" && node.callee?.object?.name === "Object"
    && node.callee?.property?.name === "freeze" ? node.arguments[0] : node);

  let pin = null;
  visit(await parse("build.mjs"), (node) => {
    if (node.type === "VariableDeclarator" && node.id?.name === "VERIFY_EXISTING_DEPENDENCIES") pin = unfreeze(node.init);
  });
  const pinned = (key) => unfreeze(pin.properties.find((entry) => entry.key.name === key).value);
  const packages = pinned("packages").elements.map((element) => element.value);
  const partiallyPinned = pinned("files").properties.map((entry) => entry.key.name);
  const subpaths = pinned("subpaths").properties.map((entry) => entry.key.value);
  // Build mode only: resolves Next to spawn `next build`; never reached on the --verify-existing path.
  const buildModeOnly = ["next/dist/bin/next"];

  const unpinned = [];
  const unanalysable = [];
  const buildOnlySeen = [];
  for (const file of ["build.mjs", "verify-initial-bundle-boundary.mjs", "inspect-turbopack-emission.mjs", "origin-gate.mjs",
    "verify-origin-artifacts.mjs"]) {
    const sources = [];
    visit(await parse(file), (node) => {
      if (["ImportDeclaration", "ExportAllDeclaration", "ExportNamedDeclaration", "ImportExpression"].includes(node.type)
        && node.source) sources.push(node.source);
      if (node.type === "CallExpression" && (node.callee?.name === "require"
        || (node.callee?.type === "MemberExpression" && node.callee.object?.name === "require"))) sources.push(node.arguments[0]);
    });
    for (const source of sources) {
      if (source?.type !== "Literal" || typeof source.value !== "string") {
        unanalysable.push(file);
        continue;
      }
      const specifier = source.value;
      if (specifier.startsWith("./") || specifier.startsWith("../") || isBuiltin(specifier)) continue;
      if (buildModeOnly.includes(specifier)) {
        buildOnlySeen.push(`${file}:${specifier}`);
        continue;
      }
      const packageName = specifier.split("/").slice(0, specifier.startsWith("@") ? 2 : 1).join("/");
      if (!packages.includes(packageName) && !subpaths.includes(specifier)) unpinned.push(`${file}:${specifier}`);
    }
  }
  assert.deepEqual(unanalysable, [], "Gate files must load modules only through literal specifiers the pin test can read.");
  assert.deepEqual(unpinned, [], "A gate file loads a package that VERIFY_EXISTING_DEPENDENCIES does not pin; pin it (packages "
    + "or subpaths), re-pin the digest after review, and re-review the gate.");
  assert.deepEqual(buildOnlySeen, ["build.mjs:next/dist/bin/next"]);
  for (const specifier of subpaths) assert.ok(partiallyPinned.includes(specifier.split("/")[0]), specifier);
});

async function runBuildHarness(args, { verifier, originArtifacts, admission, untrustedRuntime = () => false } = {}) {
  const original = await readFile(new URL("./build.mjs", import.meta.url), "utf8");
  const replacements = [
    ['import { spawnSync } from "node:child_process";', "const spawnSync=globalThis.__nqrStageB.spawnSync;"],
    ['import { createRequire } from "node:module";', 'const createRequire=()=>({resolve:()=>"/not-executed-next"});'],
    ['import { assertBuildOrigin } from "./origin-gate.mjs";', "const assertBuildOrigin=globalThis.__nqrStageB.assertBuildOrigin;"],
    ["process.execArgv.length > 0 || Object.keys(process.env).some((name) => !ALLOWED_ENVIRONMENT.has(name))",
      "globalThis.__nqrStageB.untrustedRuntime()"],
    ["  await verifyDependencies();\n", "  await globalThis.__nqrStageB.dependencies();\n"],
  ];
  let harness = original;
  for (const [from, to] of replacements) {
    assert.ok(harness.includes(from), from);
    harness = harness.replace(from, to);
  }
  harness = harness
    .replaceAll('await import("./verify-initial-bundle-boundary.mjs")', "await globalThis.__nqrStageB.verifierModule()")
    .replaceAll('await import("./verify-origin-artifacts.mjs")', "await globalThis.__nqrStageB.originModule()");
  assert.ok(!harness.includes('import("./'));
  const events = [];
  const calls = { origin: [], verifier: [], originArtifacts: [] };
  const errors = [];
  const logs = [];
  const previous = { argv: process.argv, exitCode: process.exitCode, error: console.error, log: console.log };
  globalThis.__nqrStageB = {
    spawnSync: () => { events.push("spawn"); return { status: 0 }; },
    dependencies: async () => { events.push("dependencies"); },
    untrustedRuntime,
    assertBuildOrigin: (env, requested) => {
      calls.origin.push(requested);
      return admission === undefined ? { mode: "production", source: "explicit", origin: STAGE_B_ORIGIN } : admission();
    },
    verifierModule: async () => ({
      verifyInitialBundleBoundary: async (...received) => {
        events.push("verifier");
        calls.verifier.push(received);
        return verifier ? verifier(calls.verifier.length, ...received) : { status: "PASS_BUNDLE_SCOPE" };
      },
    }),
    originModule: async () => ({
      verifyOriginArtifacts: async (...received) => {
        events.push("origin");
        calls.originArtifacts.push(received);
        return originArtifacts?.(...received);
      },
    }),
  };
  process.argv = [process.execPath, "/stage-b/scripts/build.mjs", ...args];
  process.exitCode = undefined;
  console.error = (...line) => errors.push(line.join(" "));
  console.log = (...line) => logs.push(line.join(" "));
  try {
    await import(`data:text/javascript;base64,${Buffer.from(harness).toString("base64")}#${stageBHash(JSON.stringify(args))}${Math.random()}`);
    return { calls, errors, events, logs, exitCode: process.exitCode };
  } finally {
    process.argv = previous.argv;
    process.exitCode = previous.exitCode;
    console.error = previous.error;
    console.log = previous.log;
    delete globalThis.__nqrStageB;
  }
}

test("stage B: verify-existing never spawns Next, re-verifies after the origin read and prints fixed codes only", async () => {
  const valid = ["--verify-existing", "--artifact", "/stage-b/artifact", "--acceptance", "/stage-b/acceptance.json"];
  const options = { acceptancePath: "/stage-b/acceptance.json", origin: STAGE_B_ORIGIN };
  const passed = await runBuildHarness(valid);
  assert.equal(passed.exitCode, undefined);
  assert.deepEqual(passed.events, ["dependencies", "verifier", "origin", "verifier"]);
  assert.deepEqual(passed.calls.origin, ["production"]);
  assert.deepEqual(passed.calls.verifier, [["/stage-b/artifact", options], ["/stage-b/artifact", options]]);
  assert.deepEqual(passed.calls.originArtifacts, [[STAGE_B_ORIGIN, "/stage-b/artifact"]]);
  assert.ok(passed.logs.some((line) => line.includes("not deployment approval")));

  const changedAfterOrigin = await runBuildHarness(valid, { verifier: (call) => {
    if (call === 2) throw new BundleBoundaryError("NQR_BUNDLE_NEEDS_EMISSION_REVIEW", ["ADAPTER_STATIC_UNKNOWN"]);
    return { status: "PASS_BUNDLE_SCOPE" };
  } });
  assert.equal(changedAfterOrigin.exitCode, 1);
  assert.deepEqual(changedAfterOrigin.errors, ["NQR_BUNDLE_NEEDS_EMISSION_REVIEW\nreasons: ADAPTER_STATIC_UNKNOWN"]);
  assert.ok(!changedAfterOrigin.logs.some((line) => line.includes("[verify-existing]")));

  const blocked = await runBuildHarness(valid, { verifier: () => { throw new BundleBoundaryError("NQR_BUNDLE_NEEDS_EMISSION_REVIEW"); } });
  assert.deepEqual([blocked.exitCode, blocked.events, blocked.errors], [1, ["dependencies", "verifier"], ["NQR_BUNDLE_NEEDS_EMISSION_REVIEW"]]);

  const originFailure = await runBuildHarness(valid, { originArtifacts: () => {
    throw new Error("robots: /private/secret/path/robots.txt.body");
  } });
  assert.deepEqual([originFailure.exitCode, originFailure.errors], [1, ["NQR_ORIGIN_ARTIFACT_CHECK_FAILED"]]);

  const unexpected = await runBuildHarness(valid, { verifier: () => { throw new Error("ENOENT: /private/secret/path"); } });
  assert.deepEqual([unexpected.exitCode, unexpected.errors], [1, ["NQR_VERIFY_EXISTING_FAILED"]]);

  const untrusted = await runBuildHarness(valid, { untrustedRuntime: () => true });
  assert.deepEqual([untrusted.exitCode, untrusted.errors, untrusted.events], [1, ["NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME"], []]);

  const noOrigin = await runBuildHarness(valid, { admission: () => { throw new Error("[origin] explicit origin required"); } });
  assert.deepEqual([noOrigin.exitCode, noOrigin.events], [1, []]);

  for (const args of [
    ["--verify-existing"],
    ["--verify-existing", "--artifact", "/stage-b/artifact"],
    ["--verify-existing", "--artifact", "relative", "--acceptance", "/stage-b/acceptance.json"],
    ["--verify-existing", "--artifact", "/stage-b/artifact", "--acceptance", "acceptance.json"],
    ["--verify-existing", "--acceptance", "/stage-b/acceptance.json", "--artifact", "/stage-b/artifact"],
    ["--verify-existing", "--artifact", "/a", "--artifact", "/b"],
    [...valid, "--production"],
    ["--production", ...valid],
    ["--preview", "--verify-existing"],
  ]) {
    const rejected = await runBuildHarness(args);
    assert.equal(rejected.exitCode, 1, JSON.stringify(args));
    assert.match(rejected.errors.join("\n"), /^Usage: /);
    assert.deepEqual([rejected.events, rejected.calls.origin], [[], []]);
  }

  const build = await runBuildHarness([], { admission: () => null,
    verifier: () => { throw new BundleBoundaryError("NQR_BUNDLE_NEEDS_EMISSION_REVIEW"); } });
  assert.deepEqual(build.events, ["spawn", "verifier"]);
  assert.deepEqual(build.calls.verifier, [[]]);
  assert.equal(build.exitCode, 1);
});

test("stage B: the real verify-existing CLI rejects unadmitted evidence without starting Next", async () => {
  await withStageBArtifact({}, async (item) => {
    const acceptancePath = join(item.base, "acceptance.json");
    await writeFile(acceptancePath, stageBRecord(item.expectedInputs, await readGateRevision()));
    const script = fileURLToPath(new URL("./build.mjs", import.meta.url));
    const unadmitted = runVerifyExisting(script, item, acceptancePath);
    assert.equal(unadmitted.status, 1);
    assert.match(unadmitted.stderr, /^NQR_BUNDLE_NEEDS_EMISSION_REVIEW\nreasons: ACCEPTANCE_NOT_ADMITTED$/m);
    assert.doesNotMatch(unadmitted.stdout + unadmitted.stderr, /Creating an optimized|Next\.js|\[verify-existing\]/);
    const missingOrigin = runVerifyExisting(script, item, acceptancePath, {});
    assert.equal(missingOrigin.status, 1);
    assert.match(missingOrigin.stderr, /NEXT_PUBLIC_APP_URL/);
    assert.doesNotMatch(missingOrigin.stdout + missingOrigin.stderr, /Creating an optimized|NQR_BUNDLE/);
  });
});
