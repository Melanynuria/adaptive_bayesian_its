from __future__ import annotations

import pandas as pd

from .schemas import BKTDataConfig


def _normalize_correct_value(value) -> int | None:
    """
    Convert different correctness formats into 0 or 1.

    Accepted examples:
    - 1 / 0
    - True / False
    - "correct" / "incorrect"
    - "true" / "false"

    Returns:
    - 1 for correct
    - 0 for incorrect
    - None if the value cannot be interpreted
    """
    # Missing value
    if pd.isna(value):
        return None

    # Boolean case: True -> 1, False -> 0
    if isinstance(value, bool):
        return int(value)

    # Numeric case
    if isinstance(value, (int, float)):
        if value == 1:
            return 1
        if value == 0:
            return 0
        return None

    # String case
    if isinstance(value, str):
        v = value.strip().lower()

        # Recognize multiple possible "correct" values
        if v in {"1", "true", "correct", "yes"}:
            return 1

        # Recognize multiple possible "incorrect" values
        if v in {"0", "false", "incorrect", "no"}:
            return 0

    # If none of the above matched, return None
    return None


def clean_bkt_dataframe(
    df: pd.DataFrame,
    config: BKTDataConfig,
) -> pd.DataFrame:
    """
    Standardize a raw tutoring dataframe into canonical BKT columns.

    Main goals:
    1. rename raw dataset columns to consistent internal names
    2. convert correctness values into 0/1
    3. remove missing / bad rows if needed
    4. create an order column if one does not exist
    5. sort the interactions

    Returns a clean dataframe with at least:
    - student_id
    - skill_name
    - correct
    - order_id
    """
    # Check that the dataframe is not empty
    if df.empty:
        raise ValueError("Input dataframe is empty.")

    # These three are the minimum required columns in the raw data
    required_raw_cols = [
        config.student_col,
        config.skill_col,
        config.correct_col,
    ]

    # Find which required columns are missing
    missing = [col for col in required_raw_cols if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    # Build a dictionary to rename raw columns into canonical/internal names
    rename_map = {
        config.student_col: config.canonical_student_col,
        config.skill_col: config.canonical_skill_col,
        config.correct_col: config.canonical_correct_col,
    }

    # Add optional rename for problem column if it exists
    if config.problem_col and config.problem_col in df.columns:
        rename_map[config.problem_col] = config.canonical_problem_col

    # Add optional rename for step column if it exists
    if config.step_col and config.step_col in df.columns:
        rename_map[config.step_col] = config.canonical_step_col

    # Add optional rename for order column if it exists
    if config.order_col and config.order_col in df.columns:
        rename_map[config.order_col] = config.canonical_order_col

    # Rename columns and copy the dataframe so we do not modify the original
    clean_df = df.rename(columns=rename_map).copy()

    # Convert the correctness column into 0/1 values
    clean_df[config.canonical_correct_col] = clean_df[
        config.canonical_correct_col
    ].apply(_normalize_correct_value)

    # Remove rows where correctness could not be interpreted
    if config.drop_na_correct:
        clean_df = clean_df.dropna(subset=[config.canonical_correct_col])

    # Remove rows where skill is missing
    if config.drop_na_skills:
        clean_df = clean_df.dropna(subset=[config.canonical_skill_col])

    # Standardize student ids as clean strings
    clean_df[config.canonical_student_col] = clean_df[
        config.canonical_student_col
    ].astype(str).str.strip()

    # Standardize skill names as clean strings
    clean_df[config.canonical_skill_col] = clean_df[
        config.canonical_skill_col
    ].astype(str).str.strip()

    # Make sure correctness is integer 0/1
    clean_df[config.canonical_correct_col] = clean_df[
        config.canonical_correct_col
    ].astype(int)

    # If there is no explicit order column in the dataset,
    # create one from the row index after resetting it
    if config.canonical_order_col not in clean_df.columns:
        clean_df = clean_df.reset_index(drop=True)
        clean_df[config.canonical_order_col] = clean_df.index

    # Build the subset of columns used to detect duplicates
    # We include the core learning interaction info
    duplicate_subset = [
        config.canonical_student_col,
        config.canonical_skill_col,
        config.canonical_correct_col,
        config.canonical_order_col,
    ]

    # If problem name exists, include it in duplicate detection
    if config.canonical_problem_col in clean_df.columns:
        duplicate_subset.append(config.canonical_problem_col)

    # If step name exists, include it in duplicate detection
    if config.canonical_step_col in clean_df.columns:
        duplicate_subset.append(config.canonical_step_col)

    # Remove duplicates if enabled in config
    if config.remove_duplicates:
        clean_df = clean_df.drop_duplicates(subset=duplicate_subset)

    # Sort interactions by student and then by order
    sort_cols = [config.canonical_student_col, config.canonical_order_col]
    clean_df = clean_df.sort_values(sort_cols).reset_index(drop=True)

    return clean_df