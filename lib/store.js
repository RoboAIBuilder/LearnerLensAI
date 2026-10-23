// Storage for Learner Lens. Uses Upstash Redis (added from Vercel's Storage tab),
// or an in-memory store when LL_MEMORY=1 (local testing only; not persistent).
import { Redis } from "@upstash/redis";

export const COLLECTIONS = new Set(["students", "tasks", "attempts", "activity", "program"]);
const ID_RE = /^[A-Za-z0-9_.\-]{1,80}$/;
const MAX_BYTES = 50_000;

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;
const memory = globalThis.__llMemory || (globalThis.__llMemory = new Map());
const useMemory = !redis && process.env.LL_MEMORY === "1";

export const storageReady = () => Boolean(redis || useMemory);
const key = (c) => `ll:${c}`;
const parse = (v) => (typeof v === "string" ? JSON.parse(v) : v);

export function checkCollection(c) {
  if (!COLLECTIONS.has(c)) throw httpError(400, "unknown_collection");
}
export function checkId(id) {
  if (typeof id !== "string" || !ID_RE.test(id)) throw httpError(400, "bad_id");
}
export function checkData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw httpError(400, "bad_data");
  if (JSON.stringify(data).length > MAX_BYTES) throw httpError(413, "too_large");
}
export function httpError(status, code) {
  const e = new Error(code);
  e.status = status;
  e.code = code;
  return e;
}

export async function getAll(c) {
  if (redis) {
    const h = (await redis.hgetall(key(c))) || {};
    const out = {};
    for (const [id, v] of Object.entries(h)) out[id] = parse(v);
    return out;
  }
  return Object.fromEntries(memory.get(key(c)) || []);
}
export async function getOne(c, id) {
  if (redis) {
    const v = await redis.hget(key(c), id);
    return v == null ? null : parse(v);
  }
  return (memory.get(key(c)) || new Map()).get(id) ?? null;
}
export async function setOne(c, id, data) {
  if (redis) return redis.hset(key(c), { [id]: JSON.stringify(data) });
  if (!memory.has(key(c))) memory.set(key(c), new Map());
  memory.get(key(c)).set(id, structuredClone(data));
}
export async function deleteOne(c, id) {
  if (redis) return redis.hdel(key(c), id);
  memory.get(key(c))?.delete(id);
}
export async function clear(c) {
  if (redis) return redis.del(key(c));
  memory.delete(key(c));
}

// Merge like a document store: nested plain objects merge, everything else replaces.
export function merge(base, patch) {
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    out[k] = v && typeof v === "object" && !Array.isArray(v) && base[k] && typeof base[k] === "object" && !Array.isArray(base[k])
      ? merge(base[k], v)
      : v;
  }
  return out;
}

export function classCodeOk(req) {
  const code = process.env.CLASS_CODE;
  if (!code) return true;
  return req.headers["x-class-code"] === code;
}

export async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  const chunks = [];
  for await (const ch of req) chunks.push(ch);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}
