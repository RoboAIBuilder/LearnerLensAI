/* Learner Lens storage adapter for Vercel.
   On claude.ai the page gets a database from the platform (window.claude.use("db")).
   Here the same interface is provided on top of /api/db, refreshed by polling. */
(function () {
  if (window.claude && window.claude.use) return;
  window.__LL_HOSTED = true;
  const POLL_MS = 5000;
  const cache = new Map();          // collection -> { docs: {id: data}, listeners: Set, loaded: bool }
  let seedTried = false;

  const entry = (c) => { if (!cache.has(c)) cache.set(c, { docs: {}, listeners: new Set(), loaded: false }); return cache.get(c); };
  const clone = (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
  const docSnap = (c, id) => { const d = entry(c).docs[id]; return { id, exists: !!d, data: () => clone(d), metadata: { fromCache: false, hasPendingWrites: false } }; };
  const colSnap = (c) => { const docs = Object.keys(entry(c).docs).sort().map((id) => docSnap(c, id)); return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: { fromCache: false, hasPendingWrites: false } }; };
  const notify = (c) => entry(c).listeners.forEach((l) => { try { l.id ? l.next(docSnap(c, l.id)) : l.next(colSnap(c)); } catch (e) { console.error(e); } });

  function classCode() { try { return localStorage.getItem("ll-class-code") || ""; } catch (e) { return ""; } }
  function setClassCode(v) { try { localStorage.setItem("ll-class-code", v); } catch (e) {} }

  async function fetchCol(c) {
    const r = await fetch("/api/db?c=" + encodeURIComponent(c), { cache: "no-store" });
    if (r.status === 503) throw { code: "unavailable", message: "Storage is not connected" };
    if (!r.ok) throw { code: "unavailable", message: "HTTP " + r.status };
    const { docs } = await r.json();
    const e = entry(c);
    const changed = JSON.stringify(docs) !== JSON.stringify(e.docs) || !e.loaded;
    e.docs = docs; e.loaded = true;
    if (c === "students" && !Object.keys(docs).length && !seedTried) {
      seedTried = true;
      const s = await fetch("/api/seed", { method: "POST" });
      if (s.ok && (await s.json()).seeded) { ["students", "tasks", "program", "attempts", "activity"].forEach((x) => fetchCol(x).catch(() => {})); return; }
    }
    if (changed) notify(c);
  }

  async function post(body, retried) {
    const r = await fetch("/api/db", { method: "POST", headers: { "Content-Type": "application/json", "x-class-code": classCode() }, body: JSON.stringify(body) });
    if (r.status === 401 && !retried) {
      const v = window.prompt("Enter the class code to save changes:");
      if (v) { setClassCode(v.trim()); return post(body, true); }
    }
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw { code: r.status === 401 || r.status === 404 || r.status === 400 ? "invalid_argument" : "unavailable", message: err.error || "HTTP " + r.status };
    }
  }

  function docRef(path) {
    const [c, id] = path.split("/");
    return {
      id, path,
      async get() { await fetchCol(c); return docSnap(c, id); },
      async set(data) { const e = entry(c); e.docs[id] = clone(data); notify(c); await post({ op: "set", c, id, data }); fetchCol(c).catch(() => {}); },
      async update(data) {
        const e = entry(c); if (e.docs[id]) { e.docs[id] = Object.assign({}, e.docs[id], clone(data)); notify(c); }
        await post({ op: "update", c, id, data }); fetchCol(c).catch(() => {});
      },
      async delete() { const e = entry(c); delete e.docs[id]; notify(c); await post({ op: "delete", c, id }); fetchCol(c).catch(() => {}); },
      onSnapshot(next, error) { const l = { id, next, error }; entry(c).listeners.add(l); fetchCol(c).catch((e) => error && error(e)); return () => entry(c).listeners.delete(l); },
      collection() { throw new TypeError("Nested collections are not supported here"); },
    };
  }
  function colRef(c) {
    return {
      path: c,
      doc(id) { return docRef(c + "/" + (id || Date.now().toString(36) + Math.random().toString(36).slice(2, 8))); },
      async add(data) { const ref = this.doc(); await ref.set(data); return ref; },
      async get() { await fetchCol(c); return colSnap(c); },
      onSnapshot(next, error) { const l = { next, error }; entry(c).listeners.add(l); fetchCol(c).catch((e) => error && error(e)); return () => entry(c).listeners.delete(l); },
      where() { throw new TypeError("Queries are not supported here"); },
    };
  }
  const db = { collection: colRef, doc: docRef };

  setInterval(() => {
    if (document.hidden) return;
    for (const [c, e] of cache) if (e.listeners.size) fetchCol(c).catch(() => {});
  }, POLL_MS);

  // Resolve null if storage isn't reachable, so the page shows its "tracking is off" notice.
  let probe = null;
  async function available() {
    if (!probe) probe = fetch("/api/db?c=program", { cache: "no-store" }).then((r) => r.ok).catch(() => false);
    return probe;
  }
  window.claude = { use: async (name) => (name === "db" && (await available()) ? db : null) };
})();
