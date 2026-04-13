"Canonical structure the BKT module expects"

from dataclasses import dataclass, field
from typing import Optional, List


@dataclass(frozen=True)
class BKTDataConfig:
    """
    Column configuration to map raw tutoring logs into a canonical format.

    Canonical columns used internally:
    - student_id
    - skill_name
    - correct
    - order_id
    - problem_name (optional but useful)
    - step_name (optional but useful)
    """
    # Raw dataset column names that exist in the original dataframe
    student_col: str = "Anon Student Id"
    skill_col: str = "KC"
    correct_col: str = "Correct First Attempt"
    order_col: Optional[str] = None
    problem_col: Optional[str] = "Problem Name"
    step_col: Optional[str] = "Step Name"

    #Standard names the BKT code will use
    canonical_student_col: str = "student_id"
    canonical_skill_col: str = "skill_name"
    canonical_correct_col: str = "correct"
    canonical_order_col: str = "order_id"
    canonical_problem_col: str = "problem_name"
    canonical_step_col: str = "step_name"

    # ----- Cleaning options -----
    drop_na_skills: bool = True
    drop_na_correct: bool = True
    remove_duplicates: bool = True


@dataclass
class StudentSequence:
    """
    One student's observations for one skill.
    Example:
    student_id = "S1"
    skill_name = "move_constant"
    observations = [1, 0, 1]
    order_ids = [10, 11, 12]
    """
    student_id: str
    skill_name: str
    observations: List[int] = field(default_factory=list)
    order_ids: List[int] = field(default_factory=list)