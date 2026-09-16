import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";

const projectRoot = new URL("..", import.meta.url);
const outputRoot = new URL("../.output", import.meta.url);
const outputServer = new URL("../.output/server", import.meta.url);
const outputPublic = new URL("../.output/public", import.meta.url);
const distRoot = new URL("../dist", import.meta.url);
const distServer = new URL("../dist/server", import.meta.url);
const distPublic = new URL("../dist/public", import.meta.url);
const distOpenAi = new URL("../dist/.openai", import.meta.url);
const distServerIndex = new URL("../dist/server/index.js", import.meta.url);
const sourceHosting = new URL("../.openai/hosting.json", import.meta.url);

if (!existsSync(outputServer) || !existsSync(outputPublic)) {
  throw new Error("Expected TanStack/Nitro build output under .output/server and .output/public.");
}

rmSync(distServer, { recursive: true, force: true });
rmSync(distPublic, { recursive: true, force: true });
mkdirSync(distRoot, { recursive: true });

cpSync(outputServer, distServer, { recursive: true });
cpSync(new URL("../.output/server/index.mjs", import.meta.url), distServerIndex);
cpSync(outputPublic, distPublic, { recursive: true });

mkdirSync(distOpenAi, { recursive: true });
cpSync(sourceHosting, new URL("../dist/.openai/hosting.json", import.meta.url));

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function walk(directory) {
  const entries = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const filename = join(directory, entry.name);
    if (entry.isDirectory()) {
      entries.push(...walk(filename));
    } else if (entry.isFile()) {
      entries.push(filename);
    }
  }
  return entries;
}

function toAssetPath(filename) {
  return `/${relative(outputPublic.pathname, filename).split(sep).join("/")}`;
}

function buildEmbeddedAssetMap() {
  const map = {};
  for (const filename of walk(outputPublic.pathname)) {
    const pathname = toAssetPath(filename);
    const stat = statSync(filename);
    map[pathname] = {
      type: mimeTypes[extname(filename)] ?? "application/octet-stream",
      body: readFileSync(filename).toString("base64"),
      size: stat.size,
    };
  }
  return map;
}

const serverIndex = readFileSync(distServerIndex, "utf8");
const assetMap = JSON.stringify(buildEmbeddedAssetMap());
const fallback = `
const sitesEmbeddedAssets = ${assetMap};
function serveSitesEmbeddedAsset(pathname, request) {
  const asset = sitesEmbeddedAssets[pathname];
  if (!asset) return;
  const ifNoneMatch = request.headers.get("if-none-match");
  const etag = \`"sites-\${asset.size}-\${pathname}"\`;
  if (ifNoneMatch === etag) {
    return new Response(null, { status: 304, headers: { etag } });
  }
  const bytes = Uint8Array.from(atob(asset.body), (char) => char.charCodeAt(0));
  const headers = new Headers({
    "content-type": asset.type,
    "content-length": String(bytes.byteLength),
    etag,
  });
  if (pathname.startsWith("/assets/")) {
    headers.set("cache-control", "public, max-age=31536000, immutable");
  }
  return new Response(bytes, { headers });
}
`;

const target = `const cloudflareModule = createHandler({ fetch(cfRequest, env, context, url) {
  if (env.ASSETS && isPublicAssetURL(url.pathname)) {
    return env.ASSETS.fetch(cfRequest);
  }
} });`;

const replacement = `${fallback}
const cloudflareModule = createHandler({ async fetch(cfRequest, env, context, url) {
  if (isPublicAssetURL(url.pathname)) {
    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(cfRequest);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
    }
    return serveSitesEmbeddedAsset(url.pathname, cfRequest);
  }
} });`;

if (!serverIndex.includes(target)) {
  throw new Error("Unable to patch Cloudflare asset handler in dist/server/index.js.");
}

writeFileSync(distServerIndex, serverIndex.replace(target, replacement));

console.log("Prepared Sites output in dist/ with embedded static asset fallback.");
