"""
data_loader.py

Reads the CSV files into Pandas DataFrames (tables).
Every other part of LearnLensAI gets its data from here.
"""

import os
import pandas as pd

# The data folder is one level up from this utils/ folder
DATA_FOLDER = os.path.join(os.path.dirname(__file__), "..", "data")


def load_students():
    """Returns the students table (student_id, student_name)."""
    return pd.read_csv(os.path.join(DATA_FOLDER, "students.csv"))


def load_questions():
    """Returns the questions table (question_id, question_text, correct_answer, skill, difficulty)."""
    # dtype=str keeps answers like "7.50" or "2:3" exactly as written
    return pd.read_csv(os.path.join(DATA_FOLDER, "questions.csv"), dtype=str)


def load_responses():
    """
    Returns every student answer, with the question's skill added.

    responses.csv only says WHICH question was answered. By "merging" it with
    questions.csv we add the skill column, so we can ask things like
    "how did this student do on Fraction Operations?"
    """
    responses = pd.read_csv(
        os.path.join(DATA_FOLDER, "responses.csv"),
        dtype={"student_answer": str},
    )
    questions = load_questions()
    # Merge = join two tables using the shared column "question_id"
    return responses.merge(questions, on="question_id")
