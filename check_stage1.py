"""
check_stage1.py

A simple test script that prints the Stage 1 calculations so we can check
that they look right before building any dashboards.

Run it with:   python check_stage1.py
"""

from utils.analytics import (
    SKILLS,
    responses,
    students,
    mastery_level,
    calculate_student_score,
    calculate_skill_mastery,
    calculate_class_skill_mastery,
    find_weakest_skill,
    find_strongest_skill,
    students_below_mastery,
)

print("=== Data check ===")
print("Students: ", len(students))
print("Questions:", responses["question_id"].nunique())
print("Skills:   ", responses["skill"].nunique())
print("Responses:", len(responses))
print()

print("=== Class mastery by skill ===")
for skill in SKILLS:
    mastery = calculate_class_skill_mastery(skill)
    below = students_below_mastery(skill, threshold=60)
    print(f"{skill:<22} {mastery:5.1f}%  {mastery_level(mastery):<12}  "
          f"{len(below)} of {len(students)} students below 60%")
print()

print("=== Every student ===")
print(f"{'ID':<4} {'Name':<10} {'Overall':>7}   {'Strongest':<28} {'Weakest':<28}")
for student_id, name in zip(students["student_id"], students["student_name"]):
    overall = calculate_student_score(student_id)
    strong_skill, strong_score = find_strongest_skill(student_id)
    weak_skill, weak_score = find_weakest_skill(student_id)
    print(f"{student_id:<4} {name:<10} {overall:6.1f}%   "
          f"{strong_skill + ' ' + str(strong_score) + '%':<28} "
          f"{weak_skill + ' ' + str(weak_score) + '%':<28}")
print()

print("=== One student in detail: S04 ===")
for skill in SKILLS:
    score = calculate_skill_mastery("S04", skill)
    print(f"{skill:<22} {score:5.1f}%  {mastery_level(score)}")
