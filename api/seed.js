// POST /api/seed           → loads the mock 8th grade class if the database is empty
// POST /api/seed?reset=1   → wipes everything and reloads the mock class (needs the class code if one is set)
import { readFileSync } from "node:fs";
import { storageReady, getAll, setOne, clear, classCodeOk, send } from "../lib/store.js";

const seed = JSON.parse(readFileSync(new URL("../lib/seed.json", import.meta.url), "utf8"));

function mondayThisWeek() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const d = new Date(now);
  d.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return d.toLocaleDateString("en-CA");
}

export default async function handler(req, res) {
  try {
    if (!storageReady()) return send(res, 503, { error: "storage_not_connected" });
    if (req.method !== "POST") return send(res, 405, { error: "method_not_allowed" });
    const reset = new URL(req.url, "http://x").searchParams.get("reset") === "1";
    if (reset && !classCodeOk(req)) return send(res, 401, { error: "class_code_required" });

    const existing = await getAll("students");
    if (Object.keys(existing).length && !reset) return send(res, 200, { seeded: false });

    for (const c of ["students", "tasks", "attempts", "activity", "program"]) await clear(c);
    for (const [id, s] of Object.entries(seed.students)) await setOne("students", id, s);
    for (const [id, t] of Object.entries(seed.tasks)) await setOne("tasks", id, t);
    await setOne("program", "settings", { start: mondayThisWeek(), weeks: 6, note: "Mock 8th grade class, fictional students" });
    return send(res, 200, { seeded: true });
  } catch (e) {
    return send(res, 500, { error: "server_error" });
  }
}
