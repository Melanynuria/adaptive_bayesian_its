"""
Expectation-Maximization (EM) for Bayesian Knowledge Tracing.

This file contains the low-level fitting logic for ONE skill.

Important design choice:
This training class does not hardcode the forward/backward implementation.
Instead, it receives two callback functions:

1. expected_counts_fn(sequence, params) -> ExpectedCounts
   Computes expected hidden-state counts for one observation sequence.

2. log_likelihood_fn(sequence, params) -> float
   Computes the log-likelihood of one sequence under the given parameters.

This keeps the training layer clean and independent from the exact details
of your core math implementation.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Iterable, List, Sequence, Tuple

from bkt.core.parameters import BKTParams
from .optimizer_utils import (
    clip_params,
    has_converged,
    parameter_distance,
    safe_divide,
)


@dataclass
class ExpectedCounts:
    """
    Sufficient statistics collected during the E-step.

    Interpretation:
    - init_known: expected probability the student knows the skill at t=0
    - init_total: number of sequences contributing to initial-state estimate

    Transition counts:
    - trans_from_unknown: expected times the system was in Unknown state
      before a transition
    - trans_unknown_to_known: expected Unknown -> Known transitions
    - trans_from_known: expected times the system was in Known state
      before a transition
    - trans_known_to_unknown: expected Known -> Unknown transitions

    Emission counts:
    - emit_unknown: expected times responses were generated from Unknown
    - emit_unknown_correct: expected correct responses from Unknown
    - emit_known: expected times responses were generated from Known
    - emit_known_incorrect: expected incorrect responses from Known
    """

    init_known: float = 0.0
    init_total: float = 0.0

    trans_from_unknown: float = 0.0
    trans_unknown_to_known: float = 0.0

    trans_from_known: float = 0.0
    trans_known_to_unknown: float = 0.0

    emit_unknown: float = 0.0
    emit_unknown_correct: float = 0.0

    emit_known: float = 0.0
    emit_known_incorrect: float = 0.0

    def add(self, other: "ExpectedCounts") -> None:
        """
        Add another ExpectedCounts object into this one.

        Used to accumulate counts across many student sequences.
        """
        self.init_known += other.init_known
        self.init_total += other.init_total

        self.trans_from_unknown += other.trans_from_unknown
        self.trans_unknown_to_known += other.trans_unknown_to_known

        self.trans_from_known += other.trans_from_known
        self.trans_known_to_unknown += other.trans_known_to_unknown

        self.emit_unknown += other.emit_unknown
        self.emit_unknown_correct += other.emit_unknown_correct

        self.emit_known += other.emit_known
        self.emit_known_incorrect += other.emit_known_incorrect


@dataclass
class EMDiagnostics:
    """
    Information returned after EM finishes.

    This is useful for:
    - debugging
    - plotting convergence curves
    - comparing different random starts
    """
    iterations: int
    converged: bool
    log_likelihood_history: List[float] = field(default_factory=list)
    parameter_change_history: List[float] = field(default_factory=list)


class BKTEM:
    """
    Fit BKT parameters for one skill using EM.

    Parameters
    ----------
    expected_counts_fn:
        Function that receives (sequence, params) and returns ExpectedCounts.

    log_likelihood_fn:
        Function that receives (sequence, params) and returns sequence log-likelihood.

    max_iter:
        Maximum number of EM iterations.

    tol:
        Stop if the likelihood improvement is smaller than this value.

    allow_forgetting:
        If False, p_forget is fixed to 0.
    """

    def __init__(
        self,
        expected_counts_fn: Callable[[Sequence[int], BKTParams], ExpectedCounts],
        log_likelihood_fn: Callable[[Sequence[int], BKTParams], float],
        max_iter: int = 100,
        tol: float = 1e-4,
        allow_forgetting: bool = False,
    ) -> None:
        self.expected_counts_fn = expected_counts_fn
        self.log_likelihood_fn = log_likelihood_fn
        self.max_iter = max_iter
        self.tol = tol
        self.allow_forgetting = allow_forgetting

    def fit(
        self,
        sequences: Iterable[Sequence[int]],
        initial_params: BKTParams,
    ) -> Tuple[BKTParams, EMDiagnostics]:
        """
        Run EM on a collection of sequences for one skill.

        Each sequence is a list like:
            [1, 0, 1, 1, 0]
        where:
            1 = correct
            0 = incorrect
        """
        sequences = [seq for seq in sequences if len(seq) > 0]
        if not sequences:
            raise ValueError("Cannot fit EM: no non-empty sequences were provided.")

        params = clip_params(initial_params, allow_forgetting=self.allow_forgetting)

        diagnostics = EMDiagnostics(
            iterations=0,
            converged=False,
            log_likelihood_history=[],
            parameter_change_history=[],
        )

        # Compute the initial likelihood before any update.
        current_ll = self._dataset_log_likelihood(sequences, params)
        diagnostics.log_likelihood_history.append(current_ll)

        for iteration in range(1, self.max_iter + 1):
            # -------------------------
            # E-step
            # -------------------------
            # Collect expected sufficient statistics over all sequences.
            counts = self._e_step(sequences, params)

            # -------------------------
            # M-step
            # -------------------------
            # Convert expected counts into new parameter estimates.
            new_params = self._m_step(counts, previous_params=params)

            # Evaluate the updated model.
            new_ll = self._dataset_log_likelihood(sequences, new_params)

            diagnostics.iterations = iteration
            diagnostics.log_likelihood_history.append(new_ll)
            diagnostics.parameter_change_history.append(
                parameter_distance(params, new_params)
            )

            # Convergence check based on log-likelihood improvement.
            if has_converged(current_ll, new_ll, self.tol):
                diagnostics.converged = True
                params = new_params
                break

            # Continue with the next iteration.
            params = new_params
            current_ll = new_ll

        return params, diagnostics

    def _e_step(
        self,
        sequences: Iterable[Sequence[int]],
        params: BKTParams,
    ) -> ExpectedCounts:
        """
        Run the E-step over all sequences.

        For each sequence, the core forward-backward logic returns expected counts.
        Those counts are then added together to form global sufficient statistics.
        """
        total_counts = ExpectedCounts()

        for seq in sequences:
            seq_counts = self.expected_counts_fn(seq, params)
            total_counts.add(seq_counts)

        return total_counts

    def _m_step(
        self,
        counts: ExpectedCounts,
        previous_params: BKTParams,
    ) -> BKTParams:
        """
        Update parameters using expected counts.

        Standard BKT interpretation:
        - p_init   = expected probability of starting in Known
        - p_learn  = expected U->K transitions / expected times in U before transition
        - p_guess  = expected correct responses from U / expected times in U
        - p_slip   = expected incorrect responses from K / expected times in K
        - p_forget = expected K->U transitions / expected times in K before transition
        """
        p_init = safe_divide(
            counts.init_known,
            counts.init_total,
            fallback=previous_params.p_init,
        )

        p_learn = safe_divide(
            counts.trans_unknown_to_known,
            counts.trans_from_unknown,
            fallback=previous_params.p_learn,
        )

        p_guess = safe_divide(
            counts.emit_unknown_correct,
            counts.emit_unknown,
            fallback=previous_params.p_guess,
        )

        p_slip = safe_divide(
            counts.emit_known_incorrect,
            counts.emit_known,
            fallback=previous_params.p_slip,
        )

        if self.allow_forgetting:
            p_forget = safe_divide(
                counts.trans_known_to_unknown,
                counts.trans_from_known,
                fallback=previous_params.p_forget,
            )
        else:
            p_forget = 0.0

        updated = BKTParams(
            p_init=p_init,
            p_learn=p_learn,
            p_guess=p_guess,
            p_slip=p_slip,
            p_forget=p_forget,
        )

        return clip_params(updated, allow_forgetting=self.allow_forgetting)

    def _dataset_log_likelihood(
        self,
        sequences: Iterable[Sequence[int]],
        params: BKTParams,
    ) -> float:
        """
        Compute total log-likelihood across all sequences.

        This is the main objective tracked during EM.
        """
        return sum(self.log_likelihood_fn(seq, params) for seq in sequences)
    