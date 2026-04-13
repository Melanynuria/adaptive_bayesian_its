"""
Small helper functions used during BKT parameter fitting.

Why this file exists:
- EM updates can produce values extremely close to 0 or 1
- those values can cause numerical instability
- we also need convergence checks and safe division helpers
"""

from __future__ import annotations

from bkt.core.parameters import BKTParams


# Small epsilon to avoid exact 0 or exact 1 probabilities.
EPSILON = 1e-6


def clip_probability(value: float, eps: float = EPSILON) -> float:
    """
    Force a probability into the open interval (eps, 1-eps).

    This prevents:
    - division by zero
    - log(0)
    - degenerate EM updates
    """
    return min(max(value, eps), 1.0 - eps)


def clip_params(params: BKTParams, allow_forgetting: bool = False) -> BKTParams:
    """
    Return a new BKTParams object with all values clipped to safe ranges.

    If forgetting is not allowed, p_forget is fixed to 0.
    """
    return BKTParams(
        p_init=clip_probability(params.p_init),
        p_learn=clip_probability(params.p_learn),
        p_guess=clip_probability(params.p_guess),
        p_slip=clip_probability(params.p_slip),
        p_forget=clip_probability(params.p_forget) if allow_forgetting else 0.0,
    )


def safe_divide(numerator: float, denominator: float, fallback: float) -> float:
    """
    Divide safely.

    If denominator is 0, return a fallback value instead of crashing.
    This is useful in the M-step when a count is missing or too small.
    """
    if abs(denominator) < EPSILON:
        return fallback
    return numerator / denominator


def parameter_distance(old: BKTParams, new: BKTParams) -> float:
    """
    Measure how much the parameters changed in one EM iteration.

    We use the maximum absolute difference across all parameters.
    """
    return max(
        abs(old.p_init - new.p_init),
        abs(old.p_learn - new.p_learn),
        abs(old.p_guess - new.p_guess),
        abs(old.p_slip - new.p_slip),
        abs(old.p_forget - new.p_forget),
    )


def has_converged(
    old_log_likelihood: float,
    new_log_likelihood: float,
    tolerance: float,
) -> bool:
    """
    Decide whether EM has converged based on likelihood improvement.

    EM typically stops when improvement becomes very small.
    """
    return abs(new_log_likelihood - old_log_likelihood) < tolerance