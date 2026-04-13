from __future__ import annotations

from collections import defaultdict
import pandas as pd

from .schemas import StudentSequence


def build_sequences_by_skill(
    df: pd.DataFrame,
    student_col: str = "student_id",
    skill_col: str = "skill_name",
    correct_col: str = "correct",
    order_col: str = "order_id",
) -> dict[str, list[StudentSequence]]:
    """
    Build BKT sequences grouped by skill, then by student.

    Output format:
    {
        "move_constant": [
            StudentSequence(
                student_id="S1",
                skill_name="move_constant",
                observations=[1, 0, 1],
                order_ids=[5, 6, 7]
            ),
            ...
        ],
        "divide_both_sides": [
            ...
        ]
    }

    Why group by skill?
    Because classical BKT is usually trained one skill at a time.
    """
    # Make sure all required columns exist
    required = [student_col, skill_col, correct_col, order_col]
    missing = [col for col in required if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    # Sort rows to ensure the sequences are in the correct order
    work_df = df.sort_values([skill_col, student_col, order_col]).reset_index(drop=True)

    # Group interactions by (skill, student)
    grouped = work_df.groupby([skill_col, student_col], sort=False)

    # Dictionary: skill -> list of StudentSequence
    sequences_by_skill: dict[str, list[StudentSequence]] = defaultdict(list)

    # Build one sequence for each (skill, student) pair
    for (skill_name, student_id), group in grouped:
        seq = StudentSequence(
            student_id=str(student_id),
            skill_name=str(skill_name),
            observations=group[correct_col].astype(int).tolist(),
            order_ids=group[order_col].astype(int).tolist(),
        )
        sequences_by_skill[str(skill_name)].append(seq)

    return dict(sequences_by_skill)


def build_sequences_dataframe(
    df: pd.DataFrame,
    student_col: str = "student_id",
    skill_col: str = "skill_name",
    correct_col: str = "correct",
    order_col: str = "order_id",
) -> pd.DataFrame:
    """
    Return a compact dataframe with one row per (student, skill) sequence.

    This is especially useful for:
    - debugging
    - inspecting the training input
    - verifying the sequence lengths before fitting BKT

    Example output columns:
    - student_id
    - skill_name
    - n_obs
    - observations
    - order_ids
    """
    # First build the grouped sequence dictionary
    sequences_by_skill = build_sequences_by_skill(
        df=df,
        student_col=student_col,
        skill_col=skill_col,
        correct_col=correct_col,
        order_col=order_col,
    )

    # Convert the dictionary structure into a flat dataframe
    rows = []
    for skill_name, sequences in sequences_by_skill.items():
        for seq in sequences:
            rows.append(
                {
                    "student_id": seq.student_id,
                    "skill_name": skill_name,
                    "n_obs": len(seq.observations),
                    "observations": seq.observations,
                    "order_ids": seq.order_ids,
                }
            )

    return pd.DataFrame(rows)