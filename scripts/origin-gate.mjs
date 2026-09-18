import { isIP } from "node:net";
import { pathToFileURL } from "node:url";

const reserved = [
  "localhost", "local", "internal", "lan", "home", "test", "invalid",
  "example", "onion", "arpa", "example.com", "example.net", "example.org",
];

/** Offline syntax admission only: this does not prove DNS, TLS or ownership. */
export function validateOrigin(raw, name = "NEXT_PUBLIC_APP_URL") {
  const fail = (reason) => { throw new Error(`[origin] ${name}: ${reason}`); };
  if (typeof raw !== "string" || !raw.trim()) fail("explicit HTTPS origin required");
  // Never echo raw configuration, including parser exceptions, into logs.
  if (/[\u0000-\u0020\u007f]/u.test(raw.trim()) || /[\u0000-\u001f\u007f\\]/u.test(raw)) {
    fail("control characters, embedded spaces and backslashes are forbidden");
  }
  const value = raw.trim();
  const match = /^https:\/\/([^/?#]+)\/?$/i.exec(value);
  if (!match) fail("explicit HTTPS origin required; no path, query or fragment");
  if (match[1].includes("@")) fail("credentials/userinfo are forbidden");
  let url;
  try { url = new URL(value); } catch { fail("malformed URL"); }
  if (url.protocol !== "https:" || url.origin === "null" || url.username || url.password) {
    fail("HTTPS without credentials required");
  }
  if (url.port || /:$/.test(match[1])) fail("only the default HTTPS port is allowed");
  const hostname = url.hostname;
  if (isIP(hostname.replace(/^\[|\]$/g, ""))) fail("IP literals are forbidden; use a public DNS hostname");
  const labels = hostname.split(".");
  if (hostname.length > 253 || labels.length < 2 || labels.some((label) =>
    !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) {
    fail("valid multi-label DNS hostname required; no trailing dot");
  }
  if (reserved.some((suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`))) {
    fail("local, internal and reserved hostnames are forbidden");
  }
  return url.origin;
}

/** NODE_ENV=production also means a local Next build, NOT a deployment. */
export function deploymentMode(env = process.env, requested) {
  if (requested !== undefined && !["production", "preview"].includes(requested)) {
    throw new Error("[origin] unknown release mode");
  }
  const signals = [env.NQR_DEPLOY_TARGET, env.VERCEL_ENV, env.VERCEL_TARGET_ENV]
    .filter((value) => value !== undefined);
  if (signals.some((value) => !["production", "preview", "development"].includes(value))) {
    throw new Error("[origin] unknown deployment target; specify production or preview");
  }
  if (signals.includes("production") && (requested === "preview" || env.NQR_DEPLOY_TARGET === "preview")) {
    throw new Error("[origin] production signal cannot be downgraded to preview");
  }
  if (requested === "production" || signals.includes("production")) return "production";
  if (requested === "preview" || signals.includes("preview")) return "preview";
  if (env.VERCEL === "1" || env.NQR_DEPLOY_TARGET !== undefined) {
    throw new Error("[origin] deployment requires an explicit production or preview target");
  }
  return null;
}

export function assertBuildOrigin(env = process.env, requested) {
  const mode = deploymentMode(env, requested);
  if (!mode) return null; // Plain local / PR CI builds remain database- and env-free.
  if (mode === "production" || env.NEXT_PUBLIC_APP_URL !== undefined) {
    return { mode, source: "explicit", origin: validateOrigin(env.NEXT_PUBLIC_APP_URL) };
  }
  const fallback = env.VERCEL_PROJECT_PRODUCTION_URL;
  const raw = typeof fallback === "string" && !fallback.includes(":")
    ? `https://${fallback}` : fallback;
  return { mode, source: "vercel-fallback", origin: validateOrigin(raw, "VERCEL_PROJECT_PRODUCTION_URL") };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 1 || !["--production", "--preview"].includes(args[0])) {
      throw new Error("Usage: node scripts/origin-gate.mjs --production|--preview");
    }
    const result = assertBuildOrigin(process.env, args[0].slice(2));
    console.log(`[origin] ${result.mode} configuration PASS (${result.source}); not launch approval`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
