"""
analytics.py

All of LearnLensAI's calculations, written in normal Python + Pandas.
No AI is used here: every number can be checked by hand.
"""

from utils.data_loader import load_responses, load_students

# Load the data once when this file is imported
responses = load_responses()
students = load_students()

SKILLS = [
    "Linear Equations",
    "Fraction Operations",
    "Word Problems",
    "Graph Interpretation",
    "Ratios & Proportions",
]


def mastery_level(score):
    """
    Turns a percentage (0-100) into a mastery label.
    Change these numbers to change the mastery levels.
    """
    if score >= 90:
        return "Mastered"
    elif score >= 75:
        return "Proficient"
    elif score >= 60:
        return "Developing"
    elif score >= 50:
        return "Needs Help"
    else:
        return "Critical Gap"


def calculate_student_score(student_id):
    """
    In:  a student_id like "S04"
    Out: the percentage of ALL questions that student got right.
    """
    # Keep only this student's answers
    student_answers = responses[responses["student_id"] == student_id]

    # is_correct is 1 (right) or 0 (wrong), so the average is the fraction correct
    score = student_answers["is_correct"].mean() * 100
    return round(score, 1)


def calculate_skill_mastery(student_id, skill):
    """
    In:  a student_id and a skill name
    Out: the percentage of that skill's questions the student got right.
    """
    # Find this student's answers that belong to this skill
    skill_answers = responses[
        (responses["student_id"] == student_id) & (responses["skill"] == skill)
    ]

    # Calculate the percentage answered correctly
    mastery = skill_answers["is_correct"].mean() * 100
    return round(mastery, 1)


def calculate_all_skill_mastery(student_id):
    """
    In:  a student_id
    Out: a dictionary like {"Linear Equations": 75.0, "Fraction Operations": 25.0, ...}
    """
    results = {}
    for skill in SKILLS:
        results[skill] = calculate_skill_mastery(student_id, skill)
    return results


def calculate_class_skill_mastery(skill):
    """
    In:  a skill name
    Out: the percentage of correct answers for that skill across the whole class.
    """
    # Find all answers belonging to this skill (every student)
    skill_answers = responses[responses["skill"] == skill]

    # Calculate the percentage answered correctly
    mastery = skill_answers["is_correct"].mean() * 100
    return round(mastery, 1)


def find_weakest_skill(student_id):
    """
    In:  a student_id
    Out: (skill name, score) for the skill with the LOWEST mastery.
    """
    mastery = calculate_all_skill_mastery(student_id)
    weakest = min(mastery, key=mastery.get)  # the key with the smallest value
    return weakest, mastery[weakest]


def find_strongest_skill(student_id):
    """
    In:  a student_id
    Out: (skill name, score) for the skill with the HIGHEST mastery.
    """
    mastery = calculate_all_skill_mastery(student_id)
    strongest = max(mastery, key=mastery.get)  # the key with the biggest value
    return strongest, mastery[strongest]


def students_below_mastery(skill, threshold=60):
    """
    In:  a skill name and a threshold percentage (default 60)
    Out: a list of student_ids whose mastery of that skill is below the threshold.
    """
    below = []
    for student_id in students["student_id"]:
        if calculate_skill_mastery(student_id, skill) < threshold:
            below.append(student_id)
    return below
