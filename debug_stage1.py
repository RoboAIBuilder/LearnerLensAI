"""
debug_stage1.py

A simple Streamlit page to CHECK the Stage 1 calculations.
This is not the real dashboard (that comes in Stage 2).

Run it with:   streamlit run debug_stage1.py
"""

import pandas as pd
import streamlit as st

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

st.title("LearnLensAI - Stage 1 Check")
st.caption("Checking the data and the Python calculations before building dashboards.")

# ---------------- Data check ----------------
st.header("1. Data check")
col1, col2, col3, col4 = st.columns(4)
col1.metric("Students", len(students))
col2.metric("Questions", responses["question_id"].nunique())
col3.metric("Skills", responses["skill"].nunique())
col4.metric("Responses", len(responses))

# ---------------- Class mastery ----------------
st.header("2. Class mastery by skill")
threshold = st.slider("Mastery threshold (%)", 0, 100, 60, step=5)

rows = []
for skill in SKILLS:
    mastery = calculate_class_skill_mastery(skill)
    below = students_below_mastery(skill, threshold)
    rows.append({
        "Skill": skill,
        "Class Mastery %": mastery,
        "Level": mastery_level(mastery),
        f"Students below {threshold}%": f"{len(below)} of {len(students)}",
    })
st.dataframe(pd.DataFrame(rows), hide_index=True, width="stretch")

# ---------------- One student ----------------
st.header("3. One student")
labels = students["student_id"] + " - " + students["student_name"]
choice = st.selectbox("Select Student", labels)
student_id = choice.split(" - ")[0]

strong_skill, strong_score = find_strongest_skill(student_id)
weak_skill, weak_score = find_weakest_skill(student_id)

col1, col2, col3 = st.columns(3)
col1.metric("Overall Score", f"{calculate_student_score(student_id)}%")
col2.metric("Strongest Skill", f"{strong_score}%", strong_skill, delta_color="off")
col3.metric("Weakest Skill", f"{weak_score}%", weak_skill, delta_color="off")

rows = []
for skill in SKILLS:
    score = calculate_skill_mastery(student_id, skill)
    rows.append({"Skill": skill, "Mastery %": score, "Level": mastery_level(score)})
st.dataframe(pd.DataFrame(rows), hide_index=True, width="stretch")

with st.expander("This student's 20 answers"):
    answers = responses[responses["student_id"] == student_id]
    st.dataframe(
        answers[["question_id", "skill", "question_text", "correct_answer",
                 "student_answer", "is_correct"]],
        hide_index=True, width="stretch",
    )

# ---------------- Every student ----------------
st.header("4. Every student")
rows = []
for student_id, name in zip(students["student_id"], students["student_name"]):
    row = {"ID": student_id, "Name": name, "Overall %": calculate_student_score(student_id)}
    for skill in SKILLS:
        row[skill] = calculate_skill_mastery(student_id, skill)
    rows.append(row)
st.dataframe(pd.DataFrame(rows), hide_index=True, width="stretch")

# ---------------- Raw data ----------------
st.header("5. Raw CSV data")
with st.expander("questions.csv"):
    st.dataframe(responses.drop_duplicates("question_id")[
        ["question_id", "question_text", "correct_answer", "skill", "difficulty"]],
        hide_index=True, width="stretch")
with st.expander("students.csv"):
    st.dataframe(students, hide_index=True, width="stretch")
with st.expander("responses.csv (600 rows)"):
    st.dataframe(responses[["student_id", "question_id", "student_answer", "is_correct"]],
                 hide_index=True, width="stretch")
