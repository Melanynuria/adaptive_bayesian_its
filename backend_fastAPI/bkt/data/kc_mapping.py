from __future__ import annotations

from typing import Callable, Optional
import pandas as pd


def apply_kc_mapping(
    df: pd.DataFrame,
    source_col: str,
    target_col: str = "skill_name",
    mapping_dict: Optional[dict[str, str]] = None,
    mapping_fn: Optional[Callable[[pd.Series], str | None]] = None,
    drop_unmapped: bool = False,
) -> pd.DataFrame:
    """
    Apply KC mapping to a dataframe.

    This function lets you transform raw labels into your final KC labels.

    You can use either:
    - mapping_dict: direct value-to-value mapping
    - mapping_fn: row-based custom logic

    Parameters
    ----------
    df : pd.DataFrame
        Input dataframe.

    source_col : str
        Column containing the original raw values to map from.

    target_col : str
        Column where the mapped KC labels will be stored.

    mapping_dict : dict[str, str], optional
        Example:
        {
            "x + 3 = 5": "solve_equation",
            "-x = 4": "normalize_negative_sign"
        }

    mapping_fn : callable, optional
        A custom function applied row by row.
        Useful when the KC depends on several columns, such as:
        problem name + step name + input text.

    drop_unmapped : bool
        If True, rows with no assigned KC are removed.
    """
    # Check that the source column exists
    if source_col not in df.columns:
        raise ValueError(f"Column '{source_col}' not found in dataframe.")

    # Copy dataframe so original data is not modified
    out = df.copy()

    # Option 1: direct mapping with a dictionary
    if mapping_dict is not None:
        out[target_col] = out[source_col].map(mapping_dict)

    # Option 2: row-based mapping using a custom function
    elif mapping_fn is not None:
        out[target_col] = out.apply(mapping_fn, axis=1)

    # If neither mapping_dict nor mapping_fn was given, raise error
    else:
        raise ValueError("Provide either mapping_dict or mapping_fn.")

    # Optionally remove rows where mapping failed
    if drop_unmapped:
        out = out.dropna(subset=[target_col]).reset_index(drop=True)

    return out