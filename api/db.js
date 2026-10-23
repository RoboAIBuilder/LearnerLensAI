// GET  /api/db?c=<collection>          → { docs: { id: data } }
// POST /api/db  { op, c, id, data }     → { ok: true }   op: set | update | delete
import {
  storageReady, checkCollection, checkId, checkData, getAll, getOne, setOne, deleteOne,
  merge, classCodeOk, readBody, send, httpError,
} from "../lib/store.js";

export default async function handler(req, res) {
  try {
    if (!storageReady()) return send(res, 503, { error: "storage_not_connected" });
    const url = new URL(req.url, "http://x");

    if (req.method === "GET") {
      const c = url.searchParams.get("c");
      checkCollection(c);
      return send(res, 200, { docs: await getAll(c) });
    }

    if (req.method === "POST") {
      if (!classCodeOk(req)) return send(res, 401, { error: "class_code_required" });
      const { op, c, id, data } = await readBody(req);
      checkCollection(c);
      checkId(id);
      if (op === "set") {
        checkData(data);
        await setOne(c, id, data);
      } else if (op === "update") {
        checkData(data);
        const cur = await getOne(c, id);
        if (!cur) throw httpError(404, "not_found");
        await setOne(c, id, merge(cur, data));
      } else if (op === "delete") {
        await deleteOne(c, id);
      } else {
        throw httpError(400, "bad_op");
      }
      return send(res, 200, { ok: true });
    }

    res.setHeader("Allow", "GET, POST");
    return send(res, 405, { error: "method_not_allowed" });
  } catch (e) {
    return send(res, e.status || 500, { error: e.code || "server_error" });
  }
}
