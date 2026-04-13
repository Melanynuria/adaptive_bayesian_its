"""
Training package for Bayesian Knowledge Tracing (BKT).

This folder contains the logic that learns BKT parameters from historical
student interaction sequences.

Main responsibilities:
- choose starting values for parameters
- run the EM algorithm
- fit one skill or many skills
"""

from .initializer import (
    make_default_params,
    make_random_params,
    make_multi_start_params,
)
from .em import BKTEM, ExpectedCounts, EMDiagnostics
from .trainer import BKTTrainer, SkillFitResult

__all__ = [
    "make_default_params",
    "make_random_params",
    "make_multi_start_params",
    "ExpectedCounts",
    "EMDiagnostics",
    "BKTEM",
    "SkillFitResult",
    "BKTTrainer",
]
