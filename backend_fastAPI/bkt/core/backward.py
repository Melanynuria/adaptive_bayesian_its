from typing import List, Dict

from .parameters import BKTParams
from .equations import emission_probability, transition_probability


def run_backward_pass(observations: List[int], params: BKTParams) -> List[Dict[str, float]]:
    """
    Runs the backward algorithm for a 2-state Hidden Markov Model version of BKT.

    The backward value beta_t(i) represents:
        P(observations from t+1 onward | state at time t = i)

    This function is mainly needed for the EM algorithm, where we combine
    forward and backward messages to compute expected hidden-state counts.

    Args:
        observations: List of binary observations (1 = correct, 0 = incorrect).
        params: BKT parameter set.

    Returns:
        List[Dict[str, float]]: Backward probabilities for each time step:
            [
                {"beta_unknown": ..., "beta_known": ...},
                ...
            ]
    """
    params.validate()

    n = len(observations)
    if n == 0:
        return []

    # Initialize backward messages.
    # At the final time step, there are no future observations left,
    # so beta values are both 1.
    beta = [{"beta_unknown": 1.0, "beta_known": 1.0} for _ in range(n)]

    # Move backward from the second-last observation down to the first.
    for t in range(n - 2, -1, -1):
        next_obs = observations[t + 1]

        beta_unknown = 0.0
        beta_known = 0.0

        # Compute beta_t(unknown)
        for next_state in (0, 1):
            beta_unknown += (
                transition_probability(0, next_state, params)
                * emission_probability(next_state, next_obs, params)
                * beta[t + 1]["beta_unknown" if next_state == 0 else "beta_known"]
            )

        # Compute beta_t(known)
        for next_state in (0, 1):
            beta_known += (
                transition_probability(1, next_state, params)
                * emission_probability(next_state, next_obs, params)
                * beta[t + 1]["beta_unknown" if next_state == 0 else "beta_known"]
            )

        beta[t] = {
            "beta_unknown": beta_unknown,
            "beta_known": beta_known,
        }

    return beta