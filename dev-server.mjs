// Local test server: serves index.html and the /api functions with an in-memory store.
// Run: npm install && npm run dev   →  http://localhost:3000
import http from "node:http";
import { readFile } from "node:fs/promises";
const routes = { "/api/db": (await import("./api/db.js")).default, "/api/seed": (await import("./api/seed.js")).default };
const port = Number(process.env.PORT || 3000);
http.createServer(async (req, res) => {
  const path = new URL(req.url, "http://x").pathname;
  if (routes[path]) return routes[path](req, res);
  if (path === "/" || path === "/index.html") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.end(await readFile(new URL("./index.html", import.meta.url)));
  }
  res.statusCode = 404; res.end("Not found");
}).listen(port, () => console.log(`Learner Lens on http://localhost:${port}`));
