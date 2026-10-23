// Ask Learner Lens — teacher-only questions about class results.
// GET  /api/ask            → { mode: "ai" | "demo" }
// POST /api/ask {question, history} → { mode, answer, sources, tools }
//
// Privacy and accuracy by design:
// - The AI never sees student names: students are "S1"…"S10"; the teacher's screen swaps names back in.
// - The AI never computes numbers: it calls the calculation tools in lib/insights.js and words the result.
// - Without ANTHROPIC_API_KEY the endpoint reports demo mode and the app answers locally (no AI).
import { readFileSync } from "node:fs";
import { makeInsights } from "../lib/insights.js";
import { storageReady, getAll, readBody, send } from "../lib/store.js";

const load = (f) => JSON.parse(readFileSync(new URL(`../lib/${f}`, import.meta.url), "utf8"));
const classdata = load("classdata.json");
const quizzes = load("quizzes.json");
const API = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
const MAX_TURNS = 5;

const ids = classdata.roster.map((r) => r.id);
const toAlias = Object.fromEntries(ids.map((id, i) => [id, `S${i + 1}`]));
const fromAlias = Object.fromEntries(ids.map((id, i) => [`S${i + 1}`, id]));
const alias = (v) => (Array.isArray(v) ? v.map(alias) : v && typeof v === "object"
  ? Object.fromEntries(Object.entries(v).map(([k, x]) => [toAlias[k] || k, alias(x)]))
  : typeof v === "string" && toAlias[v] ? toAlias[v] : v);

const TOOLS = [
  { name: "list_assignments", description: "List gradebook assignments with dates and class averages.", input_schema: { type: "object", properties: { subject: { type: "string", enum: ["Algebra I", "Science", "English 8", "U.S. History"] } } } },
  { name: "assignment_stats", description: "Class average, scores, students below 70% and missing work for one assignment. Accepts a name like 'Unit 1 Test' or 'egg drop project'.", input_schema: { type: "object", properties: { assignment: { type: "string" }, subject: { type: "string" } }, required: ["assignment"] } },
  { name: "compare_assignments", description: "Compare two assignments: class averages, change, and students who improved or dropped 10+ points.", input_schema: { type: "object", properties: { first: { type: "string" }, second: { type: "string" }, subject: { type: "string" } }, required: ["first", "second"] } },
  { name: "student_summary", description: "One student's averages by class, first and latest scores, missing work, support plan and checks.", input_schema: { type: "object", properties: { student: { type: "string", description: "Student code, e.g. S4" } }, required: ["student"] } },
  { name: "missing_work", description: "Missing assignments, optionally for one subject or one assignment.", input_schema: { type: "object", properties: { subject: { type: "string" }, assignment: { type: "string" } } } },
  { name: "students_below", description: "Students whose class average is below a threshold (default 70%).", input_schema: { type: "object", properties: { threshold: { type: "number" }, subject: { type: "string" } } } },
  { name: "list_tests", description: "Tests with question-level answers available for an X-ray.", input_schema: { type: "object", properties: {} } },
  { name: "test_xray", description: "Question-by-question results for a test: percent correct, most common wrong answers and the likely misconception.", input_schema: { type: "object", properties: { test: { type: "string" } }, required: ["test"] } },
  { name: "reteach_suggestion", description: "Which skills to reteach and to whom, from the most-missed questions on a test (default: latest test).", input_schema: { type: "object", properties: { test: { type: "string" } } } },
];

function system() {
  const today = new Date().toLocaleDateString("en-US", { timeZone: "America/New_York", year: "numeric", month: "long", day: "numeric" });
  return [
    "You are Learner Lens, an assistant for a middle school teacher. You answer questions about her class's results.",
    "Use the tools for every number, list and comparison. Never estimate or invent data. If the tools don't have it, say so.",
    "Students appear only as codes S1–S10. Always refer to students by their code (the teacher's screen shows the names). Never ask for or guess names.",
    "Keep answers short: 2–5 sentences or a short bulleted list. Lead with the answer. Mention which assignment or test you used.",
    "The teacher teaches Algebra I. If a subject is ambiguous, use Algebra I and say so.",
    "Stay in your lane: you only answer questions about this class's results. If asked to write essays, do homework, grade student work, give personal advice, or discuss anything else, say in one sentence that you only answer questions about class results, and suggest one you can answer.",
    "Never speculate about students' home lives, health, disabilities or behavior.",
    `Today is ${today}.`,
  ].join("\n");
}

function runTool(I, name, input) {
  const subj = input.subject || "Algebra I";
  const asg = (text) => I.findAssignment(text || "", subj) || I.findAssignment(text || "");
  const test = (text) => I.listTests().find((t) => t.id === text) || I.findTest(text || "");
  switch (name) {
    case "list_assignments": return I.listAssignments(input.subject);
    case "assignment_stats": { const a = asg(input.assignment); return a ? I.assignmentStats(a.id) : { error: "No matching assignment" }; }
    case "compare_assignments": { const a = asg(input.first), b = asg(input.second); return a && b && a.id !== b.id ? I.compareAssignments(a.id, b.id) : { error: "Couldn't find two different matching assignments" }; }
    case "student_summary": { const id = fromAlias[String(input.student || "").toUpperCase()]; return id ? I.studentSummary(id) : { error: "Unknown student code" }; }
    case "missing_work": { const a = input.assignment ? asg(input.assignment) : null; return I.missingWork(input.subject, a && a.id); }
    case "students_below": return I.belowThreshold(input.threshold || 70, input.subject);
    case "list_tests": return I.listTests();
    case "test_xray": { const t = test(input.test); return t ? I.xray(t.id) : { error: "No matching test" }; }
    case "reteach_suggestion": { const t = input.test ? test(input.test) : null; return I.reteach(t && t.id); }
    default: return { error: "Unknown tool" };
  }
}

function collectSources(v, out) {
  if (Array.isArray(v)) v.forEach((x) => collectSources(x, out));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { if (k === "source" || k === "sources") [].concat(x).forEach((s) => typeof s === "string" && out.add(s)); else collectSources(x, out); }
}

function teacherOk(req) {
  const code = process.env.TEACHER_CODE;
  return !code || req.headers["x-teacher-code"] === code;
}

export default async function handler(req, res) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (req.method === "GET") return send(res, 200, { mode: key ? "ai" : "demo", teacherCode: Boolean(process.env.TEACHER_CODE) });
  if (req.method !== "POST") return send(res, 405, { error: "method_not_allowed" });
  if (!key) return send(res, 200, { mode: "demo" });
  if (!teacherOk(req)) return send(res, 401, { error: "teacher_code_required" });

  try {
    const body = await readBody(req);
    const question = String(body.question || "").slice(0, 500).trim();
    if (!question) return send(res, 400, { error: "empty_question" });
    const history = (Array.isArray(body.history) ? body.history : []).slice(-6)
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content.slice(0, 1500) }))
      .filter((m, i, a) => m.content && (i === 0 ? m.role === "user" : m.role !== a[i - 1].role));

    if (history.length && history[history.length - 1].role === "user") history.pop();
    const db = storageReady() ? { attempts: Object.values(await getAll("attempts")), students: await getAll("students") } : { attempts: [], students: {} };
    const I = makeInsights({ ...classdata, quizzes, attempts: db.attempts, students: db.students });

    const messages = [...history, { role: "user", content: question }];
    const used = [], sources = new Set();
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const r = await fetch(`${API}/v1/messages`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: MODEL, max_tokens: 700, system: system(), tools: TOOLS, messages }),
      });
      if (!r.ok) return send(res, 502, { error: "ai_unavailable", status: r.status });
      const msg = await r.json();
      messages.push({ role: "assistant", content: msg.content });
      const calls = (msg.content || []).filter((c) => c.type === "tool_use");
      if (msg.stop_reason !== "tool_use" || !calls.length) {
        const answer = (msg.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n").trim();
        return send(res, 200, { mode: "ai", answer, sources: [...sources], tools: used });
      }
      const results = calls.map((c) => {
        used.push(c.name);
        const out = runTool(I, c.name, c.input || {});
        collectSources(out, sources);
        return { type: "tool_result", tool_use_id: c.id, content: JSON.stringify(alias(out)).slice(0, 20000) };
      });
      messages.push({ role: "user", content: results });
    }
    return send(res, 200, { mode: "ai", answer: "That question needed too many steps. Try asking about one assignment, test or student at a time.", sources: [...sources], tools: used });
  } catch (e) {
    return send(res, 500, { error: "server_error" });
  }
}
