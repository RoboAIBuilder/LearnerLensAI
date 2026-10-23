// Learner Lens insights: every number the teacher sees is calculated here, from the class data.
// Used by the in-browser demo answers and by /api/ask (where the AI only chooses which calculation to run).
// Students are referred to by id; names are added only on the teacher's screen.

export function makeInsights(ctx) {
  const roster = ctx.roster || [];
  const gradebook = ctx.gradebook || [];
  const tests = ctx.tests || [];
  const attempts = ctx.attempts || [];
  const students = ctx.students || {};
  const quizzes = ctx.quizzes || {};
  const ids = roster.map((r) => r.id);
  const round = (x) => Math.round(x);
  const avg = (xs) => (xs.length ? round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

  const SUBJECT_WORDS = [
    ["Algebra I", ["algebra", "math", "equation", "equations", "inequalit"]],
    ["Science", ["science", "force", "forces", "motion", "speed", "newton", "egg"]],
    ["English 8", ["english", "ela", "reading", "essay", "writing", "vocab", "grammar"]],
    ["U.S. History", ["history", "social studies", "colonies", "revolution", "declaration", "dbq"]],
  ];
  const norm = (s) => String(s || "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9.\s]/g, " ").replace(/\s+/g, " ").trim();
  const subjectIn = (text) => {
    const t = norm(text);
    for (const [subj, words] of SUBJECT_WORDS) if (words.some((w) => t.includes(w))) return subj;
    return null;
  };

  const pct = (a, sid) => (a.scores[sid] == null ? null : round((100 * a.scores[sid]) / a.points));

  function assignment(id) { return gradebook.find((a) => a.id === id) || null; }

  function listAssignments(subject) {
    return gradebook
      .filter((a) => !subject || a.subject === subject)
      .map((a) => ({ id: a.id, subject: a.subject, name: a.name, date: a.date, skill: a.skill, classAvg: avg(ids.map((s) => pct(a, s)).filter((x) => x != null)) }));
  }

  // Find the assignment a phrase refers to ("unit 1 test", "egg drop", "quiz 1 algebra").
  function findAssignment(text, defaultSubject) {
    const t = norm(text);
    if (!t) return null;
    const subj = subjectIn(t) || defaultSubject || null;
    let best = null, bestScore = 0;
    for (const a of gradebook) {
      const name = norm(a.name);
      const words = name.split(" ").filter((w) => w.length > 1 || /\d/.test(w));
      let score = 0;
      for (const w of words) if (new RegExp("\\b" + w.replace(/[.]/g, "\\.") + "\\b").test(t)) score += /\d/.test(w) ? 2 : 1;
      const head = norm(a.name.split(":")[0]);
      if (t.includes(head)) score += 3;
      if (subj && a.subject === subj) score += 1.5;
      if (score > bestScore) { bestScore = score; best = a; }
    }
    return bestScore >= 2 ? best : null;
  }

  function assignmentStats(id) {
    const a = assignment(id);
    if (!a) return null;
    const scored = ids.map((s) => ({ id: s, pct: pct(a, s) }));
    const done = scored.filter((x) => x.pct != null).sort((x, y) => y.pct - x.pct);
    return {
      id: a.id, subject: a.subject, name: a.name, date: a.date, skill: a.skill,
      classAvg: avg(done.map((x) => x.pct)), students: done.length,
      below70: done.filter((x) => x.pct < 70).sort((x, y) => x.pct - y.pct),
      missing: scored.filter((x) => x.pct == null).map((x) => x.id),
      top: done.slice(0, 3), scores: done,
      source: `${a.subject} · ${a.name} · ${a.date}`,
    };
  }

  function compareAssignments(idA, idB) {
    const A = assignment(idA), B = assignment(idB);
    if (!A || !B) return null;
    const [first, second] = A.date <= B.date ? [A, B] : [B, A];
    const rows = ids.map((s) => ({ id: s, from: pct(first, s), to: pct(second, s) })).filter((r) => r.from != null && r.to != null);
    const sa = assignmentStats(first.id), sb = assignmentStats(second.id);
    return {
      first: { id: first.id, subject: first.subject, name: first.name, date: first.date, classAvg: sa.classAvg },
      second: { id: second.id, subject: second.subject, name: second.name, date: second.date, classAvg: sb.classAvg },
      change: sb.classAvg - sa.classAvg,
      improved: rows.filter((r) => r.to - r.from >= 10).sort((x, y) => (y.to - y.from) - (x.to - x.from)),
      dropped: rows.filter((r) => r.from - r.to >= 10).sort((x, y) => (y.from - y.to) - (x.from - x.to)),
      sources: [sa.source, sb.source],
    };
  }

  function subjectAverage(sid, subject) {
    const list = gradebook.filter((a) => a.subject === subject && a.scores[sid] != null);
    const earned = list.reduce((s, a) => s + a.scores[sid], 0), possible = list.reduce((s, a) => s + a.points, 0);
    return possible ? round((100 * earned) / possible) : null;
  }

  function studentSummary(sid) {
    const r = roster.find((x) => x.id === sid);
    if (!r) return null;
    const subjects = [...new Set(gradebook.map((a) => a.subject))].map((subject) => {
      const list = gradebook.filter((a) => a.subject === subject).sort((x, y) => x.date.localeCompare(y.date));
      const done = list.filter((a) => a.scores[sid] != null);
      const first = done[0], last = done[done.length - 1];
      return {
        subject, average: subjectAverage(sid, subject),
        first: first && { name: first.name, date: first.date, pct: pct(first, sid) },
        latest: last && { name: last.name, date: last.date, pct: pct(last, sid) },
        missing: list.filter((a) => a.scores[sid] == null).map((a) => a.name),
      };
    });
    const plan = students[sid] ? { status: students[sid].status, focus: students[sid].focus, target: students[sid].target } : null;
    const checks = attempts.filter((a) => a.student === sid).sort((x, y) => String(x.at).localeCompare(String(y.at)))
      .map((a) => ({ check: (quizzes[a.quiz] && quizzes[a.quiz].title) || a.quiz, pct: a.pct, date: String(a.at).slice(0, 10) }));
    const testResults = tests.map((t) => ({ test: `${t.subject} · ${t.name}`, correct: t.items.filter((it, q) => t.responses[sid] && t.responses[sid][q] === it.correct).length, of: t.items.length }));
    const avgs = subjects.map((s) => s.average).filter((x) => x != null);
    return { id: sid, overall: avg(avgs), subjects, plan, checks, tests: testResults, source: "Gradebook (all classes), past tests and Learner Lens checks" };
  }

  function missingWork(subject, assignmentId) {
    return gradebook
      .filter((a) => (!subject || a.subject === subject) && (!assignmentId || a.id === assignmentId))
      .flatMap((a) => ids.filter((s) => a.scores[s] == null).map((s) => ({ id: s, subject: a.subject, name: a.name, date: a.date })));
  }

  function belowThreshold(threshold = 70, subject) {
    const subs = subject ? [subject] : [...new Set(gradebook.map((a) => a.subject))];
    return subs.map((s) => ({
      subject: s,
      students: ids.map((id) => ({ id, average: subjectAverage(id, s) })).filter((x) => x.average != null && x.average < threshold).sort((x, y) => x.average - y.average),
    }));
  }

  // ---------- Test X-ray ----------
  function checkTests() {
    const byQuiz = {};
    for (const a of attempts) if (quizzes[a.quiz]) (byQuiz[a.quiz] = byQuiz[a.quiz] || []).push(a);
    return Object.entries(byQuiz).map(([qid, list]) => {
      const latest = {};
      for (const a of list.sort((x, y) => String(x.at).localeCompare(String(y.at)))) latest[a.student] = a;
      const dates = Object.values(latest).map((a) => String(a.at).slice(0, 10)).sort();
      return { id: "check:" + qid, kind: "check", quiz: qid, subject: "Learner Lens check", name: quizzes[qid].title, date: dates[dates.length - 1], attempts: latest };
    });
  }

  function listTests() {
    return [
      ...tests.map((t) => ({ id: t.id, kind: "past", subject: t.subject, name: t.name, date: t.date, students: Object.keys(t.responses).length, questions: t.items.length })),
      ...checkTests().map((c) => ({ id: c.id, kind: "check", subject: c.subject, name: c.name, date: c.date, students: Object.keys(c.attempts).length, questions: quizzes[c.quiz].qs.length })),
    ].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  function findTest(text) {
    const t = norm(text);
    const all = listTests();
    let best = null, bestScore = 0;
    for (const x of all) {
      const words = norm(x.name).split(" ").filter((w) => w.length > 2 || /\d/.test(w));
      let score = words.filter((w) => t.includes(w)).length;
      const subj = subjectIn(t);
      if (subj && x.subject === subj) score += 1.5;
      if (score > bestScore) { bestScore = score; best = x; }
    }
    return bestScore >= 1.5 ? best : null;
  }

  function xray(testId) {
    const past = tests.find((t) => t.id === testId);
    if (past) {
      const sids = Object.keys(past.responses);
      const items = past.items.map((it, q) => {
        const missed = sids.filter((s) => past.responses[s][q] !== it.correct);
        const wrongMap = {};
        for (const s of missed) { const k = past.responses[s][q]; (wrongMap[k] = wrongMap[k] || []).push(s); }
        const wrong = Object.entries(wrongMap).map(([k, list]) => ({ answer: it.options[k], count: list.length, ids: list, why: (it.why || {})[k] || "" })).sort((a, b) => b.count - a.count);
        return { number: q + 1, question: it.q, skill: it.skill, correctAnswer: it.options[it.correct], pctCorrect: round((100 * (sids.length - missed.length)) / sids.length), missed, wrong };
      });
      const scores = sids.map((s) => ({ id: s, correct: past.items.filter((it, q) => past.responses[s][q] === it.correct).length, of: past.items.length }));
      return finishXray({ id: past.id, kind: "past", subject: past.subject, name: past.name, date: past.date, note: past.note, students: sids.length, items, scores });
    }
    const chk = checkTests().find((c) => c.id === testId);
    if (!chk) return null;
    const qz = quizzes[chk.quiz];
    const list = Object.values(chk.attempts);
    const items = qz.qs.map((it, q) => {
      const correctText = it.o.find((o) => o.ok).t;
      const missed = list.filter((a) => (a.missed || []).includes(q));
      const wrongMap = {};
      for (const a of missed) { const ans = a.answers && a.answers[q]; if (ans) (wrongMap[ans] = wrongMap[ans] || []).push(a.student); }
      const wrong = Object.entries(wrongMap).map(([ans, ids2]) => ({ answer: ans, count: ids2.length, ids: ids2, why: (it.o.find((o) => o.t === ans) || {}).why || "" })).sort((a, b) => b.count - a.count);
      return { number: q + 1, question: it.q, skill: qz.title.replace(/ (check|practice set)$/i, ""), correctAnswer: correctText, pctCorrect: round((100 * (list.length - missed.length)) / list.length), missed: missed.map((a) => a.student), wrong };
    });
    const scores = list.map((a) => ({ id: a.student, correct: a.score, of: a.total }));
    return finishXray({ id: chk.id, kind: "check", subject: chk.subject, name: chk.name, date: chk.date, note: "Latest attempt per student", students: list.length, items, scores });
  }

  function finishXray(x) {
    x.classPct = avg(x.scores.map((s) => (100 * s.correct) / s.of));
    x.hardest = [...x.items].sort((a, b) => a.pctCorrect - b.pctCorrect).filter((i) => i.pctCorrect < 80).slice(0, 3);
    x.source = `${x.subject} · ${x.name} · ${x.date} · ${x.students} students`;
    return x;
  }

  function reteach(testId) {
    const id = testId || (listTests().find((t) => t.kind === "past") || {}).id;
    const x = id && xray(id);
    if (!x) return null;
    return {
      test: x.name, subject: x.subject, date: x.date, source: x.source,
      groups: x.hardest.map((i) => ({ question: i.number, skill: i.skill, pctCorrect: i.pctCorrect, commonWrong: i.wrong[0] || null, students: i.missed })),
    };
  }

  function findStudent(text) {
    const t = norm(text);
    return roster.find((r) => { const [f, l] = norm(r.name).split(" "); return new RegExp("\\b(" + f + "|" + l + ")s?\\b").test(t); }) || null;
  }

  return { roster, listAssignments, findAssignment, assignmentStats, compareAssignments, studentSummary, missingWork, belowThreshold, listTests, findTest, xray, reteach, findStudent, subjectIn };
}
