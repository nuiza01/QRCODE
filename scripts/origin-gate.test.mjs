import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { assertBuildOrigin, deploymentMode, validateOrigin } from "./origin-gate.mjs";

// Synthetic, syntax-only domains; no DNS/HTTP calls and no selected product domain.
const origin = "https://origin-fixture.nqr-ci.com";
const fallback = "fallback-fixture.nqr-ci.com";

for (const value of [origin, `${origin}/`, `${origin}:443`, ` ${origin} `,
  "HTTPS://ORIGIN-FIXTURE.NQR-CI.COM"]) {
  test(`accept normalized origin ${value}`, () => assert.equal(validateOrigin(value), origin));
}
test("IDN and label-boundary matching", () => {
  assert.equal(validateOrigin("https://bücher.de"), "https://xn--bcher-kva.de");
  assert.equal(validateOrigin("https://notlocalhost.nqr-ci.com"), "https://notlocalhost.nqr-ci.com");
  assert.equal(validateOrigin("https://explicit-fixture.vercel.app"), "https://explicit-fixture.vercel.app");
});
const bad = [undefined, "", "   ", ":::not a url:::", "example.net", "//public.nqr-ci.com",
  "https:", "https:host", "https:///public.nqr-ci.com", `${origin}:99999`, `${origin}:`,
  "http://public.nqr-ci.com", "ftp://public.nqr-ci.com", "ws://public.nqr-ci.com", "wss://public.nqr-ci.com",
  "data:text/plain,x", "file:///tmp/x", "javascript:void(0)", `blob:${origin}/id`,
  "https://user:SECRET_MARKER@public.nqr-ci.com", "https://user@public.nqr-ci.com",
  "https://:SECRET_MARKER@public.nqr-ci.com", "https://@public.nqr-ci.com",
  `${origin}/path`, `${origin}/a/..`, `${origin}//`, `${origin}?x=1`, `${origin}#x`, `${origin}?`, `${origin}#`,
  `${origin}:8443`, `${origin}\\`, `${origin}\n`, `${origin}\t`, `${origin}\0`, `${origin}\x7f`,
  "http://localhost:3000", "https://localhost", "http://localhost:4000", "https://LOCALHOST.", "https://sub.localhost",
  ...["127.0.0.1", "127.1", "2130706433", "0x7f000001", "0177.0.0.1", "10.0.0.1", "172.16.0.1",
    "172.31.255.254", "192.168.1.1", "0.0.0.0", "169.254.169.254", "100.64.0.1", "198.18.0.1",
    "192.0.2.1", "224.0.0.1", "8.8.8.8", "[::]", "[::1]", "[fc00::1]", "[fd00::1]", "[fe80::1]",
    "[::ffff:127.0.0.1]", "[::ffff:10.0.0.1]", "[::ffff:7f00:1]", "[2606:4700:4700::1111]",
    "[fe80::1%25en0]", "intranet", "router.local", "app.internal", "a.lan", "a.home", "home.arpa",
    "example.test", "example.com", "a.example.net", "example.org", "a.invalid", "a.example", "a.onion",
    "bad_label.com", "a..com", "-bad.com", "bad-.com", `${"a".repeat(64)}.com`, "public.nqr-ci.com.",
    "%6cocalhost"].map((host) => `https://${host}`),
];
for (const [index, value] of bad.entries()) {
  test(`reject invalid origin fixture ${index + 1}, even with fallback`, () => {
    assert.throws(() => assertBuildOrigin({ NEXT_PUBLIC_APP_URL: value,
      VERCEL_PROJECT_PRODUCTION_URL: fallback }, "production"), /\[origin\]/);
  });
}
test("no-env CI and NODE_ENV production are non-deployment builds", () => {
  assert.equal(assertBuildOrigin({}), null);
  assert.equal(assertBuildOrigin({ CI: "true", NODE_ENV: "production" }), null);
});
test("production explicit precedence and no fallback", () => {
  assert.throws(() => assertBuildOrigin({ VERCEL_PROJECT_PRODUCTION_URL: fallback }, "production"));
  assert.deepEqual(assertBuildOrigin({ NEXT_PUBLIC_APP_URL: origin, VERCEL_PROJECT_PRODUCTION_URL: "SECRET_MARKER" }, "production"),
    { mode: "production", source: "explicit", origin });
});
test("preview fallback and explicit precedence", () => {
  assert.deepEqual(assertBuildOrigin({ VERCEL_ENV: "preview", VERCEL_PROJECT_PRODUCTION_URL: fallback }),
    { mode: "preview", source: "vercel-fallback", origin: `https://${fallback}` });
  assert.equal(assertBuildOrigin({ NEXT_PUBLIC_APP_URL: origin, VERCEL_PROJECT_PRODUCTION_URL: fallback }, "preview").origin, origin);
  assert.throws(() => assertBuildOrigin({ NEXT_PUBLIC_APP_URL: "", VERCEL_PROJECT_PRODUCTION_URL: fallback }, "preview"));
  for (const value of [undefined, "", `http://${fallback}`, `ftp://${fallback}`, `user@${fallback}`, `${fallback}/path`, `${fallback}?x=1`, "10.0.0.1"]) {
    assert.throws(() => assertBuildOrigin({ VERCEL_PROJECT_PRODUCTION_URL: value }, "preview"));
  }
});
test("production signals cannot be downgraded, unknown targets fail closed", () => {
  for (const name of ["VERCEL_ENV", "VERCEL_TARGET_ENV", "NQR_DEPLOY_TARGET"]) {
    assert.throws(() => assertBuildOrigin({ [name]: "production", CI: "true", VERCEL_PROJECT_PRODUCTION_URL: fallback }));
    assert.throws(() => deploymentMode({ [name]: "production" }, "preview"));
    assert.throws(() => deploymentMode({ [name]: "unknown" }));
  }
  assert.throws(() => deploymentMode({ VERCEL: "1" }));
  assert.throws(() => deploymentMode({}, "unknown"));
  assert.equal(deploymentMode({ VERCEL_ENV: "preview", VERCEL_TARGET_ENV: "production" }), "production");
});
test("CLI and release build reject before Next starts, with redacted logs", () => {
  for (const file of ["origin-gate.mjs", "build.mjs"]) {
    const result = spawnSync(process.execPath, [`scripts/${file}`, "--production"], {
      encoding: "utf8", env: { PATH: process.env.PATH, NEXT_PUBLIC_APP_URL: "https://user:SECRET_MARKER@public.nqr-ci.com" },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /credentials/);
    assert.doesNotMatch(result.stdout + result.stderr, /SECRET_MARKER|Next\.js|Creating an optimized/);
  }
});

for (const signal of ["VERCEL_ENV", "VERCEL_TARGET_ENV", "NQR_DEPLOY_TARGET"]) {
  test(`real Next config prevents bypass via ${signal}`, () => {
    // Exercises the actual next.config.ts loader, not a mock of the guard.
    // No build, network, port or .next output; project has no real env files in CI.
    const result = spawnSync(process.execPath, ["-e",
      'require("next/dist/server/config").default(require("next/constants").PHASE_PRODUCTION_BUILD,process.cwd()).catch(e=>{console.error(e.message);process.exitCode=1})'], {
      env: { PATH: process.env.PATH, [signal]: "production", CI: "true",
        VERCEL_PROJECT_PRODUCTION_URL: fallback }, encoding: "utf8", timeout: 20000,
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /NEXT_PUBLIC_APP_URL: explicit HTTPS origin required/);
  });
}
