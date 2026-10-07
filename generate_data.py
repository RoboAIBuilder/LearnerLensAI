"""
generate_data.py

Creates the three synthetic (fake) CSV files that LearnLensAI uses:
    data/students.csv   - 30 fictional students
    data/questions.csv  - 20 Grade 8 math questions (4 per skill)
    data/responses.csv  - 600 rows (30 students x 20 questions)

The data is NOT completely random. We build in patterns on purpose so the
app has something interesting to find (for example, Fraction Operations
is the weakest skill and many students add numerators and denominators).

Run it with:   python generate_data.py
Using the same random "seed" means you get the same data every time.
"""

import random
import pandas as pd

random.seed(8)  # change this number to get a different (but repeatable) class

# ---------------------------------------------------------------
# 1. Students
# ---------------------------------------------------------------
first_names = [
    "Ava", "Liam", "Maya", "Noah", "Zara", "Ethan", "Priya", "Lucas",
    "Sofia", "Omar", "Chloe", "Arjun", "Emma", "Mateo", "Leah", "Kai",
    "Nina", "Ravi", "Grace", "Jonah", "Isla", "Diego", "Hana", "Owen",
    "Mila", "Sam", "Aisha", "Leo", "Ruby", "Theo",
]
last_initials = "ABCDEFGHJKLMNPRSTWBCDGHKLMPRST"

students = []
for i in range(30):
    students.append({
        "student_id": f"S{i + 1:02d}",                      # S01, S02, ...
        "student_name": f"{first_names[i]} {last_initials[i]}.",
    })

# ---------------------------------------------------------------
# 2. Questions
# Each question has: id, text, correct answer, skill, difficulty,
# and one "wrong_answer" that shows a typical mistake.
# (wrong_answer is only used here to create the fake responses.)
# ---------------------------------------------------------------
questions = [
    # ---- Linear Equations ----
    ("Q01", "Solve for x: x + 7 = 15", "8", "Linear Equations", "Easy", "22"),
    ("Q02", "Solve for x: 3x = 21", "7", "Linear Equations", "Easy", "18"),
    ("Q03", "Solve for x: 2x + 5 = 17", "6", "Linear Equations", "Medium", "12"),
    ("Q04", "Solve for x: 4x - 3 = 2x + 9", "6", "Linear Equations", "Hard", "2"),
    # ---- Fraction Operations ----
    # The wrong answers here are the "add the tops and add the bottoms" mistake
    ("Q05", "1/2 + 1/4 = ?", "3/4", "Fraction Operations", "Easy", "2/6"),
    ("Q06", "3/4 + 1/2 = ?", "5/4", "Fraction Operations", "Medium", "4/6"),
    ("Q07", "2/3 + 1/5 = ?", "13/15", "Fraction Operations", "Medium", "3/8"),
    ("Q08", "5/6 - 1/4 = ?", "7/12", "Fraction Operations", "Hard", "4/2"),
    # ---- Word Problems ----
    # The wrong answers come from turning the words into the wrong equation
    ("Q09", "Maya has 3 times as many stickers as Leo. Together they have 48. "
            "How many stickers does Leo have?", "12", "Word Problems", "Medium", "16"),
    ("Q10", "A number decreased by 5 is 12. What is the number?",
            "17", "Word Problems", "Easy", "7"),
    ("Q11", "A phone plan costs $20 per month plus $5 per GB of data. "
            "This month's bill was $45. How many GB were used?",
            "5", "Word Problems", "Medium", "9"),
    ("Q12", "Sam is 4 years older than twice his sister's age. Sam is 18. "
            "How old is his sister?", "7", "Word Problems", "Hard", "11"),
    # ---- Graph Interpretation ----
    ("Q13", "A line passes through (0, 2) and (2, 6). What is its slope?",
            "2", "Graph Interpretation", "Easy", "1/2"),
    ("Q14", "What is the y-intercept of the line y = 3x - 4?",
            "-4", "Graph Interpretation", "Easy", "3"),
    ("Q15", "A distance-time graph goes from (0 h, 0 km) to (4 h, 200 km). "
            "What is the speed in km/h?", "50", "Graph Interpretation", "Medium", "200"),
    ("Q16", "A line passes through (1, 5) and (3, 1). What is its slope?",
            "-2", "Graph Interpretation", "Hard", "2"),
    # ---- Ratios & Proportions ----
    ("Q17", "Simplify the ratio 12:18", "2:3", "Ratios & Proportions", "Easy", "3:2"),
    ("Q18", "3 notebooks cost $4.50. How much do 5 notebooks cost?",
            "7.50", "Ratios & Proportions", "Medium", "6.50"),
    ("Q19", "A recipe uses 2 cups of flour for every 3 cups of milk. "
            "How much flour is needed for 9 cups of milk?",
            "6", "Ratios & Proportions", "Medium", "8"),
    ("Q20", "On a map, 1 cm = 5 km. How many km does 7.5 cm represent?",
            "37.5", "Ratios & Proportions", "Hard", "12.5"),
]

skills = ["Linear Equations", "Fraction Operations", "Word Problems",
          "Graph Interpretation", "Ratios & Proportions"]

# ---------------------------------------------------------------
# 3. How many questions (out of 4) each student gets right per skill
#
# There are 30 students x 4 questions = 120 answers per skill.
# To hit the target class mastery we pick the TOTAL number correct:
#   Linear Equations      96 / 120 = 80%
#   Fraction Operations   64 / 120 = 53%
#   Word Problems         72 / 120 = 60%
#   Graph Interpretation  88 / 120 = 73%
#   Ratios & Proportions  94 / 120 = 78%
# ---------------------------------------------------------------
target_correct = {
    "Linear Equations": 96,
    "Fraction Operations": 64,
    "Word Problems": 72,
    "Graph Interpretation": 88,
    "Ratios & Proportions": 94,
}

# Give every student a hidden "ability" so strong students tend to be
# strong in most skills (real classes look like this).
ability = {}
for s in students:
    ability[s["student_id"]] = random.uniform(-1.0, 1.0)


def make_correct_counts(skill):
    """Return a dictionary {student_id: number correct (0-4)} for one skill."""
    average = target_correct[skill] / 30  # average correct per student

    # Start each student near the average, nudged by their ability
    counts = {}
    for s in students:
        sid = s["student_id"]
        guess = round(average + 1.2 * ability[sid] + random.uniform(-0.8, 0.8))
        counts[sid] = max(0, min(4, guess))  # keep between 0 and 4

    # Adjust one student at a time until the class total is exactly the target
    while sum(counts.values()) != target_correct[skill]:
        sid = random.choice(list(counts.keys()))
        if sum(counts.values()) < target_correct[skill] and counts[sid] < 4:
            counts[sid] += 1
        elif sum(counts.values()) > target_correct[skill] and counts[sid] > 0:
            counts[sid] -= 1
    return counts


def make_fraction_counts():
    """
    Fractions are set up on purpose: 20 of 30 students score below 60%.
    6 students get 4/4, 4 get 3/4, 8 get 2/4, 12 get 1/4  -> total 64.
    Weaker students (lower ability) get the lower scores.
    """
    score_list = [4] * 6 + [3] * 4 + [2] * 8 + [1] * 12
    # sort students from strongest to weakest (with a little noise)
    ids = [s["student_id"] for s in students]
    ids.sort(key=lambda sid: ability[sid] + random.uniform(-0.4, 0.4), reverse=True)
    counts = {}
    for sid, score in zip(ids, score_list):
        counts[sid] = score
    return counts


correct_counts = {}
for skill in skills:
    if skill == "Fraction Operations":
        correct_counts[skill] = make_fraction_counts()
    else:
        correct_counts[skill] = make_correct_counts(skill)

# ---------------------------------------------------------------
# 4. Choose 18 students who have the fraction misconception
# (they add the numerators and add the denominators). Only students who
# got at least one fraction question wrong can show the mistake.
# ---------------------------------------------------------------
could_show_mistake = []
for s in students:
    if correct_counts["Fraction Operations"][s["student_id"]] < 4:
        could_show_mistake.append(s["student_id"])
fraction_misconception = random.sample(could_show_mistake, 18)

# ---------------------------------------------------------------
# 5. Build the 600 responses
# ---------------------------------------------------------------
difficulty_weight = {"Easy": 1, "Medium": 2, "Hard": 3}  # harder = more likely missed
responses = []

for s in students:
    sid = s["student_id"]
    for skill in skills:
        skill_questions = [q for q in questions if q[3] == skill]
        num_wrong = 4 - correct_counts[skill][sid]

        # Choose which questions this student gets wrong (hard ones more often)
        wrong_ids = []
        pool = list(skill_questions)
        for _ in range(num_wrong):
            weights = [difficulty_weight[q[4]] for q in pool]
            pick = random.choices(pool, weights=weights)[0]
            wrong_ids.append(pick[0])
            pool.remove(pick)

        for q in skill_questions:
            qid, text, correct, _, difficulty, typical_wrong = q
            if qid not in wrong_ids:
                answer = correct
            elif skill == "Fraction Operations":
                if sid in fraction_misconception:
                    answer = typical_wrong  # adds tops and bottoms
                else:
                    # some other wrong fraction (not the misconception answer)
                    answer = typical_wrong
                    while answer in (typical_wrong, correct):
                        answer = f"{random.randint(1, 9)}/{random.randint(2, 12)}"
            elif skill == "Word Problems" or random.random() < 0.5:
                # Word problems: mostly the "wrong equation" mistake
                if random.random() < 0.85:
                    answer = typical_wrong
                else:
                    answer = str(random.randint(1, 20))
            else:
                answer = typical_wrong
            # Make sure a "random" wrong answer is never accidentally correct
            if qid in wrong_ids and answer == correct:
                answer = typical_wrong
            responses.append({
                "student_id": sid,
                "question_id": qid,
                "student_answer": answer,
                "is_correct": 1 if answer == correct else 0,
            })

# ---------------------------------------------------------------
# 6. Save to CSV files
# ---------------------------------------------------------------
students_df = pd.DataFrame(students)
questions_df = pd.DataFrame(
    [q[:5] for q in questions],
    columns=["question_id", "question_text", "correct_answer", "skill", "difficulty"],
)
responses_df = pd.DataFrame(responses)

students_df.to_csv("data/students.csv", index=False)
questions_df.to_csv("data/questions.csv", index=False)
responses_df.to_csv("data/responses.csv", index=False)

print("Created data/students.csv  ->", len(students_df), "students")
print("Created data/questions.csv ->", len(questions_df), "questions")
print("Created data/responses.csv ->", len(responses_df), "responses")
