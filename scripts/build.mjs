import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir, realpath, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { assertBuildOrigin } from "./origin-gate.mjs";

const require = createRequire(import.meta.url);
const USAGE = "Usage: node scripts/build.mjs [--production|--preview]"
  + " | env -i PATH=\"$PATH\" NEXT_PUBLIC_APP_URL=<origin> node scripts/build.mjs --verify-existing --artifact <absolute-dir>"
  + " --acceptance <absolute-file> | env -i PATH=\"$PATH\" node scripts/build.mjs --print-dependency-digest";

// Only these variables may be set for --verify-existing and --print-dependency-digest: NODE_OPTIONS, NODE_PATH,
// HOME (global module folders) and loader variables all change what Node loads. Run as
// `env -i PATH="$PATH" NEXT_PUBLIC_APP_URL=<origin> node scripts/build.mjs --verify-existing …` with no Node flags.
// DYLD_* libraries are loaded before any JavaScript runs, and a substituted `node` on PATH cannot be detected here.
// macOS CoreFoundation adds __CF_USER_TEXT_ENCODING to every process.
const ALLOWED_ENVIRONMENT = new Set(["PATH", "NEXT_PUBLIC_APP_URL", "TMPDIR", "LANG", "LC_ALL", "TZ", "__CF_USER_TEXT_ENCODING"]);

// Drift detection for the package code that --verify-existing loads (verifier, adapter, origin checks), hashed before
// any of it is imported. It is not a boundary against anyone who can write node_modules, scripts/ or these files while
// the gate runs; SECURITY C2 still requires verifying the tree from a separate process on a read-only snapshot.
// Re-pin only after the changed tree has been checked against the lockfile/registry integrity from a separate process:
// `env -i PATH="$PATH" node scripts/build.mjs --print-dependency-digest`. The printed value is not itself that check.
const VERIFY_EXISTING_DEPENDENCIES = Object.freeze({
  packages: Object.freeze(["jsdom", "parse5", "entities"]),
  files: Object.freeze({ next: Object.freeze(["package.json", "dist/compiled/acorn/acorn.js"]) }),
  // Subpath specifiers the gate requires from a partially pinned package, and the pinned file each must resolve to.
  subpaths: Object.freeze({ "next/dist/compiled/acorn/acorn": "dist/compiled/acorn/acorn.js" }),
  sha256: "753c93434bf2a8ea029a4c900b0cef8cd0543ac6d2cd014b05e962b97735969c",
});

const ascending = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const digestOf = (bytes) => createHash("sha256").update(bytes).digest("hex");
const dependencyMismatch = () => new Error("NQR_VERIFY_EXISTING_DEPENDENCY_MISMATCH");

function assertTrustedRuntime() {
  // Defense in depth only: code injected before this module could already patch anything it checks.
  if (process.execArgv.length > 0 || Object.keys(process.env).some((name) => !ALLOWED_ENVIRONMENT.has(name))) {
    throw new Error("NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME");
  }
}

/**
 * Hashes the pinned packages' dependency closure as Node would resolve it from scripts/, without loading package
 * code: lookups use Node's own search paths, packages are read through their real paths, and rows are keyed by
 * name@version so the digest does not depend on where the project lives. In each search folder, a file Node's CommonJS
 * resolver would try first (<name>, <name>.js/.json/.node) or a <name> directory without package.json (which ESM and
 * CommonJS index lookup accept) is a mismatch. A dependency that no search folder provides in any form (for example
 * jsdom's optional canvas peer) is recorded as absent. A symlink inside a package or a node_modules directory below a
 * package root is also a mismatch, as is a package scope above scripts/ whose name matches a pinned package (ESM and
 * CommonJS self-reference would load it instead of node_modules), or a pinned subpath that Node's resolver maps to any
 * file other than the hashed one.
 */
async function dependencyDigest(scriptsDir) {
  const rows = [];
  const visited = new Set();
  const pinnedNames = [...VERIFY_EXISTING_DEPENDENCIES.packages, ...Object.keys(VERIFY_EXISTING_DEPENDENCIES.files)];
  for (let dir = scriptsDir; ; dir = dirname(dir)) {
    const manifest = await readFile(join(dir, "package.json"), "utf8").catch(() => null);
    if (manifest !== null) {
      if (pinnedNames.includes(JSON.parse(manifest).name)) throw dependencyMismatch();
      break;
    }
    if (dirname(dir) === dir) break;
  }
  async function resolvePackage(name, fromDir) {
    // The trailing slash forces package lookup for names that are also Node builtins (punycode).
    for (const base of createRequire(join(fromDir, "resolve.js")).resolve.paths(`${name}/`) ?? []) {
      const candidate = join(base, name);
      for (const suffix of [".js", ".json", ".node"]) {
        if ((await stat(`${candidate}${suffix}`).catch(() => null))?.isFile()) throw dependencyMismatch();
      }
      if (!await lstat(candidate).catch(() => null)) continue;
      const target = await stat(candidate).catch(() => null);
      if (!target?.isDirectory()) throw dependencyMismatch();
      const manifest = await readFile(join(candidate, "package.json"), "utf8").catch(() => null);
      if (manifest === null) throw dependencyMismatch();
      return { dir: await realpath(candidate), manifest: JSON.parse(manifest) };
    }
    return null;
  }
  async function hashTree(root, dir, key) {
    for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => ascending(a.name, b.name))) {
      const path = join(dir, entry.name);
      if (entry.isDirectory() && entry.name === "node_modules") {
        if (dir !== root) throw dependencyMismatch();
        const names = [];
        for (const child of (await readdir(path, { withFileTypes: true })).sort((a, b) => ascending(a.name, b.name))) {
          if (child.name.startsWith("@") && child.isDirectory()) {
            for (const scoped of (await readdir(join(path, child.name))).sort(ascending)) names.push(`${child.name}/${scoped}`);
          } else {
            names.push(child.name);
          }
        }
        rows.push({ nodeModules: names, package: key });
      } else if (entry.isDirectory()) {
        await hashTree(root, path, key);
      } else if (entry.isFile()) {
        rows.push({ file: relative(root, path).split(sep).join("/"), package: key, sha256: digestOf(await readFile(path)) });
      } else {
        throw dependencyMismatch();
      }
    }
  }
  async function visit(name, fromDir, requester) {
    const found = await resolvePackage(name, fromDir);
    if (!found) {
      rows.push({ absent: name, requester });
      return;
    }
    if (visited.has(found.dir)) return;
    visited.add(found.dir);
    const key = `${found.manifest.name}@${found.manifest.version}`;
    await hashTree(found.dir, found.dir, key);
    const { dependencies = {}, optionalDependencies = {}, peerDependencies = {} } = found.manifest;
    for (const dependency of [...new Set([...Object.keys(dependencies), ...Object.keys(optionalDependencies),
      ...Object.keys(peerDependencies)])].sort(ascending)) {
      await visit(dependency, found.dir, key);
    }
  }
  for (const name of VERIFY_EXISTING_DEPENDENCIES.packages) await visit(name, scriptsDir, "scripts");
  for (const [name, files] of Object.entries(VERIFY_EXISTING_DEPENDENCIES.files)) {
    const found = await resolvePackage(name, scriptsDir);
    if (!found) throw dependencyMismatch();
    const key = `${found.manifest.name}@${found.manifest.version}`;
    for (const file of files) rows.push({ file, package: key, sha256: digestOf(await readFile(join(found.dir, ...file.split("/")))) });
  }
  for (const [specifier, file] of Object.entries(VERIFY_EXISTING_DEPENDENCIES.subpaths)) {
    const found = await resolvePackage(specifier.split("/")[0], scriptsDir);
    // An extensionless or other earlier candidate must not win over the hashed file.
    const resolved = await realpath(createRequire(join(scriptsDir, "resolve.js")).resolve(specifier)).catch(() => null);
    if (!found || resolved !== await realpath(join(found.dir, ...file.split("/")))) throw dependencyMismatch();
  }
  return digestOf(JSON.stringify(rows.map((row) => JSON.stringify(row)).sort(ascending)));
}

async function verifyDependencies() {
  const digest = await dependencyDigest(dirname(fileURLToPath(import.meta.url))).catch(() => null);
  if (digest !== VERIFY_EXISTING_DEPENDENCIES.sha256) throw dependencyMismatch();
}

async function verifyExisting(artifact, acceptancePath, origin) {
  assertTrustedRuntime();
  await verifyDependencies();
  const { verifyInitialBundleBoundary } = await import("./verify-initial-bundle-boundary.mjs");
  const options = { acceptancePath, origin };
  await verifyInitialBundleBoundary(artifact, options);
  const { verifyOriginArtifacts } = await import("./verify-origin-artifacts.mjs");
  try {
    await verifyOriginArtifacts(origin, artifact);
  } catch {
    throw new Error("NQR_ORIGIN_ARTIFACT_CHECK_FAILED");
  }
  // Re-verify after the origin read so a change between the two checks cannot be reported as one artifact.
  // Changes reverted between reads, including dependency files swapped between hashing and import, are outside what
  // these path-based checks can prove (Stage A C4, Stage B S1/E).
  await verifyInitialBundleBoundary(artifact, options);
}

try {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--print-dependency-digest") {
    assertTrustedRuntime();
    // Fixed code only: a missing pinned file would otherwise print an absolute path.
    console.log(await dependencyDigest(dirname(fileURLToPath(import.meta.url))).catch(() => { throw dependencyMismatch(); }));
    process.exit(0);
  }
  const existing = args[0] === "--verify-existing";
  if (existing
    ? args.length !== 5 || args[1] !== "--artifact" || args[3] !== "--acceptance" || !isAbsolute(args[2]) || !isAbsolute(args[4])
    : args.length > 1 || (args.length && !["--production", "--preview"].includes(args[0]))) {
    throw new Error(USAGE);
  }
  // verify-existing checks the accepted production origin; it has no default artifact or evidence path.
  const admission = assertBuildOrigin(process.env, existing ? "production" : args[0]?.slice(2));
  if (existing) {
    console.log(`[origin] ${admission.mode} configuration PASS (${admission.source})`);
    try {
      // Existing artifact only: never spawns Next, typegen, an analyzer, a server, a browser or a database.
      await verifyExisting(args[2], args[4], admission.origin);
    } catch (error) {
      // Fixed codes only; filesystem errors can carry absolute paths.
      const code = error?.name === "BundleBoundaryError" || /^NQR_[A-Z_]+$/.test(error?.message || "")
        ? error.message : "NQR_VERIFY_EXISTING_FAILED";
      throw new Error(error?.reasonCodes?.length ? `${code}\nreasons: ${error.reasonCodes.join(",")}` : code);
    }
    console.log("[verify-existing] bundle and origin scopes PASS for this exact artifact; not deployment approval");
  } else {
    // These exports have priority over Next's .env files. Gate and build therefore
    // use the same explicit origin. No dotenv loader, database or network in gate.
    const env = { ...process.env };
    if (admission) {
      env.NQR_DEPLOY_TARGET = admission.mode;
      if (admission.source === "explicit") env.NEXT_PUBLIC_APP_URL = admission.origin;
      console.log(`[origin] ${admission.mode} configuration PASS (${admission.source})`);
    }
    const build = spawnSync(process.execPath, [require.resolve("next/dist/bin/next"), "build"], {
      env, stdio: "inherit",
    });
    if (build.error || build.status !== 0) process.exit(build.status || 1);
    // A fresh build has no admitted QA evidence yet, so this always stays blocked.
    const { verifyInitialBundleBoundary } = await import("./verify-initial-bundle-boundary.mjs");
    await verifyInitialBundleBoundary();
    if (admission) {
      const { verifyOriginArtifacts } = await import("./verify-origin-artifacts.mjs");
      await verifyOriginArtifacts(admission.origin);
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
