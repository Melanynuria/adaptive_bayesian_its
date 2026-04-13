import math
from typing import List

from .parameters import BKTParams
from .equations import predict_correct_probability, posterior_after_observation, apply_learning_transition


def sequence_probability(observations: List[int], params: BKTParams) -> float:
    """
    Computes the probability of observing the full response sequence
    under the current BKT parameters using the forward belief update.

    Args:
        observations: List of 0/1 observations.
        params: BKT parameter set.

    Returns:
        float: Probability of the full sequence.
    """
    params.validate()

    p_known = params.p_init
    prob = 1.0

    for obs in observations:
        p_correct = predict_correct_probability(p_known, params)

        # Multiply by the probability of the actual observed outcome
        prob *= p_correct if obs == 1 else (1.0 - p_correct)

        # Update hidden knowledge belief for next step
        posterior = posterior_after_observation(p_known, obs, params)
        p_known = apply_learning_transition(posterior, params)

    return prob


def sequence_log_likelihood(observations: List[int], params: BKTParams, eps: float = 1e-12) -> float:
    """
    Computes the log-likelihood of a response sequence.

    Log-likelihood is numerically safer than raw likelihood when sequences are long.

    Args:
        observations: List of 0/1 observations.
        params: BKT parameter set.
        eps: Small value to avoid log(0).

    Returns:
        float: Log-likelihood of the sequence.
    """
    prob = sequence_probability(observations, params)
    return math.log(max(prob, eps))


def total_log_likelihood(sequences: List[List[int]], params: BKTParams, eps: float = 1e-12) -> float:
    """
    Computes the total log-likelihood over multiple student sequences.

    Args:
        sequences: List of response sequences.
        params: BKT parameter set.
        eps: Small numerical stability constant.

    Returns:
        float: Sum of log-likelihoods across all sequences.
    """
    return sum(sequence_log_likelihood(seq, params, eps=eps) for seq in sequences)