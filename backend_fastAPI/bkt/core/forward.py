from typing import List, Dict

from .parameters import BKTParams
from .equations import (
    predict_correct_probability,
    posterior_after_observation,
    apply_learning_transition,
)


def run_forward_pass(observations: List[int], params: BKTParams) -> List[Dict[str, float]]:
    """
    Runs the standard BKT forward belief update over a sequence of observations.

    For each step, it stores:
    - prior knowledge before seeing the answer
    - predicted probability of a correct answer
    - posterior knowledge after seeing the answer
    - next prior after the learning transition

    Args:
        observations: List of binary responses (1 = correct, 0 = incorrect).
        params: BKT parameter set.

    Returns:
        List[Dict[str, float]]: Step-by-step trace of the forward pass.
    """
    params.validate()

    results = []
    p_known = params.p_init

    for t, obs in enumerate(observations):
        p_correct = predict_correct_probability(p_known, params)
        posterior = posterior_after_observation(p_known, obs, params)
        next_p_known = apply_learning_transition(posterior, params)

        results.append(
            {
                "t": t,
                "observation": obs,
                "prior_known": p_known,
                "pred_correct": p_correct,
                "posterior_known": posterior,
                "next_prior_known": next_p_known,
            }
        )

        p_known = next_p_known

    return results