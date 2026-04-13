from .parameters import BKTParams


def predict_correct_probability(p_known: float, params: BKTParams) -> float:
    """
    Computes the probability that the student answers correctly
    before observing the response.

    Formula:
        P(Correct) = P(Known) * (1 - slip) + (1 - P(Known)) * guess

    Args:
        p_known: Current probability that the student knows the skill.
        params: BKT parameter set.

    Returns:
        float: Probability of a correct response.
    """
    return p_known * (1.0 - params.p_slip) + (1.0 - p_known) * params.p_guess


def posterior_after_observation(p_known: float, observation: int, params: BKTParams) -> float:
    """
    Updates the probability that the student knows the skill
    after observing a correct or incorrect answer.

    Uses Bayes' rule.

    If observation == 1:
        P(Known | Correct)

    If observation == 0:
        P(Known | Incorrect)

    Args:
        p_known: Prior probability that the student knows the skill.
        observation: Observed response, 1 for correct and 0 for incorrect.
        params: BKT parameter set.

    Returns:
        float: Posterior probability that the skill is known after observing the response.
    """
    if observation not in (0, 1):
        raise ValueError(f"Observation must be 0 or 1, got {observation}")

    if observation == 1:
        numerator = p_known * (1.0 - params.p_slip)
        denominator = numerator + (1.0 - p_known) * params.p_guess
    else:
        numerator = p_known * params.p_slip
        denominator = numerator + (1.0 - p_known) * (1.0 - params.p_guess)

    if denominator == 0.0:
        return 0.0

    return numerator / denominator


def apply_learning_transition(p_known_posterior: float, params: BKTParams) -> float:
    """
    Applies the hidden-state transition after the observation.

    Standard BKT with optional forgetting:
        P(Known at next step)
        = P(Known now) * (1 - forget)
          + (1 - P(Known now)) * learn

    Args:
        p_known_posterior: Probability of knowledge after seeing the observation.
        params: BKT parameter set.

    Returns:
        float: Probability of knowledge before the next observation.
    """
    return (
        p_known_posterior * (1.0 - params.p_forget)
        + (1.0 - p_known_posterior) * params.p_learn
    )


def emission_probability(state_known: int, observation: int, params: BKTParams) -> float:
    """
    Returns P(observation | hidden_state).

    Hidden states:
        0 = skill not known
        1 = skill known

    Observations:
        0 = incorrect
        1 = correct

    Args:
        state_known: Hidden state of knowledge (0 or 1).
        observation: Observed correctness (0 or 1).
        params: BKT parameter set.

    Returns:
        float: Emission probability.
    """
    if state_known not in (0, 1):
        raise ValueError(f"state_known must be 0 or 1, got {state_known}")
    if observation not in (0, 1):
        raise ValueError(f"observation must be 0 or 1, got {observation}")

    if state_known == 1:
        return 1.0 - params.p_slip if observation == 1 else params.p_slip

    return params.p_guess if observation == 1 else 1.0 - params.p_guess


def transition_probability(from_state: int, to_state: int, params: BKTParams) -> float:
    """
    Returns P(next_state | current_state).

    Args:
        from_state: Current hidden state (0 or 1).
        to_state: Next hidden state (0 or 1).
        params: BKT parameter set.

    Returns:
        float: Transition probability.
    """
    if from_state not in (0, 1) or to_state not in (0, 1):
        raise ValueError("States must be 0 or 1")

    # From unknown
    if from_state == 0:
        return params.p_learn if to_state == 1 else 1.0 - params.p_learn

    # From known
    return params.p_forget if to_state == 0 else 1.0 - params.p_forget