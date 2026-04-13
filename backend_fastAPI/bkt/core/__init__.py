"""
Core mathematical components of the Bayesian Knowledge Tracing (BKT) model.

This package contains:
- parameter definitions
- update equations
- forward algorithm
- backward algorithm
- likelihood computation

It should remain independent from the data loading, training, API, or storage layers.
"""

from .parameters import BKTParams
from .equations import (
    predict_correct_probability,
    posterior_after_observation,
    apply_learning_transition,
)
from .forward import run_forward_pass
from .backward import run_backward_pass
from .likelihood import sequence_log_likelihood

__all__ = [
    "BKTParams",
    "predict_correct_probability",
    "posterior_after_observation",
    "apply_learning_transition",
    "run_forward_pass",
    "run_backward_pass",
    "sequence_log_likelihood",
]