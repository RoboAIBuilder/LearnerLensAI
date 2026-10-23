"""Builds lib/classdata.json: the mock class's gradebook (as if imported from Google Classroom)
and two past tests with every student's answer to every question. All students are fictional."""
import json, pathlib
N = None
roster = [("maya","Maya Adams"),("ethan","Ethan Brooks"),("lily","Lily Chen"),("mateo","Mateo Diaz"),("noah","Noah Evans"),
          ("ava","Ava Fischer"),("arjun","Arjun Gupta"),("zoe","Zoe Harris"),("kenji","Kenji Ito"),("olivia","Olivia Johnson")]
ids = [r[0] for r in roster]
subjects = {
 "Algebra I": [("Quiz 1: Multi-step Equations","2026-09-14",20,"Multi-step equations"),("Quiz 2: Literal Equations","2026-09-21",20,"Literal equations"),("Homework: Inequalities","2026-09-28",10,"Inequalities"),("Unit 1 Test: Equations & Inequalities","2026-10-05",100,"Equations & inequalities"),("Project: Budget Equations","2026-10-12",50,"Applying equations")],
 "Science": [("Quiz 1: Speed & Velocity","2026-09-11",20,"Speed & velocity"),("Lab 1: Newton's 2nd Law","2026-09-18",25,"Newton's laws"),("Quiz 2: Forces & Motion","2026-09-25",20,"Forces & motion"),("Unit 1 Test","2026-10-02",100,"Forces & motion"),("Project: Egg Drop Design","2026-10-09",50,"Engineering design")],
 "English 8": [("Reading Quiz: Central Idea","2026-09-10",20,"Central idea"),("Essay 1: Argument Writing","2026-09-17",50,"Argument writing"),("Vocab Quiz 1","2026-09-24",20,"Vocabulary"),("Grammar: Commas & Clauses","2026-10-01",10,"Grammar"),("Unit 1 Test","2026-10-08",100,"Reading & writing")],
 "U.S. History": [("Map Quiz: 13 Colonies","2026-09-09",20,"Geography"),("DBQ 1: Causes of the Revolution","2026-09-16",50,"Primary sources"),("Quiz 2: Declaration of Independence","2026-09-23",20,"Founding documents"),("Homework: Revolution Timeline","2026-09-30",10,"Chronology"),("Unit 1 Test","2026-10-07",100,"Revolution era")],
}
scores = {
 "Algebra I":[[18,19,10,92,46],[9,14,6,61,38],[17,18,9,87,44],[11,16,N,70,40],[20,19,10,96,48],[8,11,5,55,N],[15,17,8,82,43],[10,18,9,76,42],[12,13,7,66,37],[16,17,10,84,45]],
 "Science":[[17,23,18,89,45],[15,20,16,78,42],[19,24,19,94,47],[13,18,12,68,39],[18,22,17,88,44],[10,14,9,57,N],[16,21,17,85,43],[14,22,15,79,41],[11,15,10,60,34],[17,23,18,87,46]],
 "English 8":[[19,46,19,9,93],[17,44,18,9,86],[18,45,17,8,90],[12,31,13,6,64],[16,38,17,8,81],[11,29,12,N,58],[15,37,16,7,79],[19,47,18,10,95],[16,40,17,8,82],[17,43,18,9,88]],
 "U.S. History":[[18,44,18,10,90],[16,40,17,9,83],[17,42,18,9,88],[13,30,14,N,66],[17,39,16,8,84],[9,27,11,5,55],[16,38,17,8,81],[18,45,18,10,92],[15,36,15,8,77],[17,41,17,9,86]],
}
gradebook = []
for subj, asgs in subjects.items():
    for i, (name, date, pts, skill) in enumerate(asgs):
        slug = {"Algebra I": "alg", "Science": "sci", "English 8": "eng", "U.S. History": "his"}[subj] + "-" + str(i + 1)
        gradebook.append({"id": slug, "subject": subj, "name": name, "date": date, "points": pts, "skill": skill,
                          "scores": {sid: scores[subj][k][i] for k, sid in enumerate(ids)}})

def test(tid, subject, name, date, items, misses, gradebook_id):
    """misses: {student: {q_index: wrong_option_index}}; everyone else answered correctly."""
    resp = {}
    for sid in ids:
        row = []
        for qi, it in enumerate(items):
            row.append(misses.get(sid, {}).get(qi, it["correct"]))
        resp[sid] = row
    return {"id": tid, "subject": subject, "name": name, "date": date, "gradebookId": gradebook_id,
            "note": "Multiple-choice part", "items": items, "responses": resp}

def item(q, options, correct, skill, why):
    return {"q": q, "options": options, "correct": correct, "skill": skill, "why": why}

alg = [
 item("3x − 7 = 14", ["x = 7","x = 7/3","x = 21","x = 3"], 0, "Two-step equations", {"1":"Subtracted 7 instead of adding (3x = 7)","2":"Forgot to divide by 3","3":"Divided 21 by 7 instead of by 3"}),
 item("2(x + 4) = 18", ["x = 5","x = 7","x = 14","x = 9"], 0, "Distributive property", {"1":"Didn't distribute: wrote 2x + 4","2":"Subtracted 4 from 18 without dividing","3":"Divided 18 by 2 and stopped"}),
 item("5x + 3 = 2x + 18", ["x = 5","x = 3","x = 15","x = 7"], 0, "Variables on both sides", {"1":"Added 2x instead of subtracting (7x = 21)","2":"Stopped at 3x = 15","3":"Added 3 instead of subtracting (3x = 21)"}),
 item("4(x − 1) = 2(x + 5)", ["x = 7","x = 3","x = 6","x = 2"], 0, "Distributive property", {"1":"Distributed only to the first term in each parentheses","2":"Arithmetic slip after distributing","3":"Dropped the −4"}),
 item("x ÷ 4 − 2 = 3", ["x = 20","x = 12","x = 1.25","x = 5"], 0, "Equations with fractions", {"1":"Ignored the −2 (x ÷ 4 = 3)","2":"Divided by 4 instead of multiplying","3":"Stopped at x ÷ 4 = 5"}),
 item("Solve A = lw for w", ["w = A ÷ l","w = A − l","w = Al","w = l ÷ A"], 0, "Literal equations", {"1":"Subtracted instead of dividing","2":"Multiplied instead of dividing","3":"Divided in the wrong order"}),
 item("−3x > 12", ["x < −4","x > −4","x < 4","x > 4"], 0, "Inequalities", {"1":"Didn't flip the sign when dividing by a negative","2":"Dropped the negative","3":"Dropped the negative and didn't flip"}),
 item("−2 < x + 1 ≤ 5", ["−3 < x ≤ 4","−1 < x ≤ 6","−3 ≤ x < 4","x ≤ 4"], 0, "Compound inequalities", {"1":"Added 1 instead of subtracting","2":"Swapped the inequality signs","3":"Solved only one side"}),
 item("Phone plan: $25 plus $0.10 per text. The bill is $40. How many texts?", ["150","15","650","400"], 0, "Equation word problems", {"1":"Didn't divide 15 by 0.10","2":"Added 25 instead of subtracting","3":"Divided 40 by 0.10 and ignored the $25"}),
 item("|x − 3| = 5", ["x = 8 or x = −2","x = 8 only","x = 2 or x = −8","x = −2 only"], 0, "Absolute value equations", {"1":"Forgot the negative case","2":"Subtracted 3 in both cases","3":"Kept only the negative case"}),
]
alg_miss = {"maya":{6:1},"ethan":{1:1,3:1,6:1,9:1},"lily":{9:1},"mateo":{6:1,8:1,9:1},
            "ava":{1:1,2:1,4:1,6:1,7:1},"arjun":{6:1,9:1},"zoe":{1:1,3:1},"kenji":{1:1,5:1,6:1},"olivia":{6:2,9:1}}
sci = [
 item("A 2 kg cart accelerates at 3 m/s². Net force?", ["6 N","1.5 N","5 N","0.67 N"], 0, "F = ma", {"1":"Divided mass by acceleration","2":"Added instead of multiplying","3":"Divided acceleration by mass"}),
 item("A book sits still on a table. The forces on it are…", ["Balanced","Unbalanced","Zero; no forces act"], 0, "Balanced forces", {"1":"Thought a still object has unbalanced forces","2":"Forgot gravity and the table's push"}),
 item("10 N pushes right, 4 N pushes left. Net force?", ["6 N right","14 N right","6 N left"], 0, "Net force", {"1":"Added forces in opposite directions","2":"Picked the wrong direction"}),
 item("Seatbelts protect you because of…", ["Inertia (1st law)","Newton's 3rd law","Gravity only"], 0, "Newton's 1st law", {"1":"Mixed up the 1st and 3rd laws","2":"Thought gravity throws you forward"}),
 item("The same force pushes a 1 kg and a 4 kg cart. Which accelerates more?", ["The 1 kg cart","The 4 kg cart","Same"], 0, "Newton's 2nd law", {"1":"Thought more mass means more acceleration","2":"Ignored mass"}),
 item("A swimmer pushes back on the pool wall. What happens?", ["The wall pushes the swimmer forward","The wall doesn't push back","The swimmer stops"], 0, "Newton's 3rd law", {"1":"Didn't see the reaction force","2":"Thought pushing stops motion"}),
]
sci_miss = {"maya":{2:1},"ethan":{2:1},"mateo":{0:1,2:1,5:1},"noah":{5:1},"ava":{0:1,1:2,2:1,4:1},"arjun":{2:1},"zoe":{3:1,5:1},"kenji":{0:1,1:2,4:1,5:1},"olivia":{3:1}}
tests = [test("alg-u1", "Algebra I", "Unit 1 Test: Equations & Inequalities", "2026-10-05", alg, alg_miss, "alg-4"),
         test("sci-q2", "Science", "Quiz 2: Forces & Motion", "2026-09-25", sci, sci_miss, "sci-3")]
out = {"note": "Mock 8th grade class. All students are fictional.", "roster": [{"id": i, "name": n} for i, n in roster],
       "gradebook": gradebook, "tests": tests}
p = pathlib.Path(__file__).resolve().parent.parent / "lib" / "classdata.json"
p.write_text(json.dumps(out, ensure_ascii=False, indent=1))
for t in tests:
    print(t["name"], [sum(1 for r in t["responses"].values() if r[q] != it["correct"]) for q, it in enumerate(t["items"])],
          {s: sum(1 for q, it in enumerate(t["items"]) if t["responses"][s][q] == it["correct"]) for s in ids})
print("wrote", p, len(gradebook), "assignments")
