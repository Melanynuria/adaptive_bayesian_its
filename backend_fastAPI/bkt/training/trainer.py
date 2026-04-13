"""
High-level trainer for BKT.

This file sits one level above EM:
- EM fits ONE skill for ONE starting point
- BKTTrainer fits ONE skill with many starts, then chooses the best result
- BKTTrainer can also fit ALL skills in the dataset
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Dict, Iterable, Mapping, Sequence

from bkt.core.parameters import BKTParams
from .em import BKTEM, EMDiagnostics, ExpectedCounts
from .initializer import make_multi_start_params


@dataclass
class SkillFitResult:
    """
    Stores the final fitted result for one skill.
    """
    skill_name: str
    params: BKTParams
    log_likelihood: float
    converged: bool
    iterations: int
    diagnostics: EMDiagnostics


class BKTTrainer:
    """
    High-level interface for fitting BKT models.

    Typical usage:
        trainer = BKTTrainer(
            expected_counts_fn=your_expected_counts_function,
            log_likelihood_fn=your_log_likelihood_function,
            n_starts=5,
            max_iter=100,
            tol=1e-4,
        )

        result = trainer.fit_skill("move_constant", sequences)
        all_results = trainer.fit_all_skills(sequences_by_skill)

    Notes
    -----
    sequences should be grouped by skill beforehand.
    Example format:
        {
            "move_constant": [[1, 0, 1], [0, 1], [1, 1, 1, 0]],
            "divide_both_sides": [[0, 0, 1], [1, 1]]
        }
    """

    def __init__(
        self,
        expected_counts_fn: Callable[[Sequence[int], BKTParams], ExpectedCounts],
        log_likelihood_fn: Callable[[Sequence[int], BKTParams], float],
        n_starts: int = 5,
        max_iter: int = 100,
        tol: float = 1e-4,
        seed: int | None = 42,
        allow_forgetting: bool = False,
    ) -> None:
        self.expected_counts_fn = expected_counts_fn
        self.log_likelihood_fn = log_likelihood_fn
        self.n_starts = n_starts
        self.max_iter = max_iter
        self.tol = tol
        self.seed = seed
        self.allow_forgetting = allow_forgetting

    def fit_skill(
        self,
        skill_name: str,
        sequences: Iterable[Sequence[int]],
    ) -> SkillFitResult:
        """
        Fit one skill using multi-start EM.

        Why multi-start:
        - EM may converge to local optima
        - we run several initializations
        - we keep the solution with the best final log-likelihood
        """
        sequences = [seq for seq in sequences if len(seq) > 0]
        if not sequences:
            raise ValueError(f"No valid sequences found for skill '{skill_name}'.")

        starts = make_multi_start_params(
            n_starts=self.n_starts,
            seed=self.seed,
            allow_forgetting=self.allow_forgetting,
        )

        em = BKTEM(
            expected_counts_fn=self.expected_counts_fn,
            log_likelihood_fn=self.log_likelihood_fn,
            max_iter=self.max_iter,
            tol=self.tol,
            allow_forgetting=self.allow_forgetting,
        )

        best_result: SkillFitResult | None = None

        for start_params in starts:
            fitted_params, diagnostics = em.fit(
                sequences=sequences,
                initial_params=start_params,
            )

            final_ll = diagnostics.log_likelihood_history[-1]

            result = SkillFitResult(
                skill_name=skill_name,
                params=fitted_params,
                log_likelihood=final_ll,
                converged=diagnostics.converged,
                iterations=diagnostics.iterations,
                diagnostics=diagnostics,
            )

            if best_result is None or result.log_likelihood > best_result.log_likelihood:
                best_result = result

        # This cannot be None because we already checked that sequences is not empty.
        return best_result  # type: ignore[return-value]

    def fit_all_skills(
        self,
        sequences_by_skill: Mapping[str, Iterable[Sequence[int]]],
    ) -> Dict[str, SkillFitResult]:
        """
        Fit BKT parameters for every skill in the dataset.

        Input example:
            {
                "move_constant": [[1, 0, 1], [0, 1]],
                "simplify_like_terms": [[1, 1], [0, 1, 1]]
            }

        Output example:
            {
                "move_constant": SkillFitResult(...),
                "simplify_like_terms": SkillFitResult(...)
            }
        """
        results: Dict[str, SkillFitResult] = {}

        for skill_name, sequences in sequences_by_skill.items():
            results[skill_name] = self.fit_skill(skill_name, sequences)

        return results