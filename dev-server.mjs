// Local test server: serves the site and the /api functions with an in-memory store.
// Run: npm install && npm run dev   →  http://localhost:3000
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, normalize } from "node:path";
const routes = { "/api/db": (await import("./api/db.js")).default, "/api/seed": (await import("./api/seed.js")).default };
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".png": "image/png", ".webmanifest": "application/manifest+json", ".json": "application/json" };
const STATIC = new Set(["/index.html", "/sw.js", "/manifest.webmanifest"]);
const port = Number(process.env.PORT || 3000);
http.createServer(async (req, res) => {
  let path = normalize(new URL(req.url, "http://x").pathname);
  if (routes[path]) return routes[path](req, res);
  if (path === "/") path = "/index.html";
  if (!STATIC.has(path) && !path.startsWith("/icons/")) { res.statusCode = 404; return res.end("Not found"); }
  try {
    const body = await readFile(new URL("." + path, import.meta.url));
    res.setHeader("Content-Type", types[extname(path)] || "application/octet-stream");
    if (path === "/sw.js" || path === "/index.html") res.setHeader("Cache-Control", "no-cache");
    res.end(body);
  } catch { res.statusCode = 404; res.end("Not found"); }
}).listen(port, () => console.log(`Learner Lens on http://localhost:${port}`));
