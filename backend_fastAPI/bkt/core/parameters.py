from dataclasses import dataclass

@dataclass
class BKTParams:
    """
    Stores the parameters of a standard Bayesian Knowledge Tracing model.

    Attributes:
        p_init: Initial probability that the student already knows the skill
                before the first opportunity.
        p_learn: Probability of transitioning from unlearned to learned
                 after an opportunity.
        p_guess: Probability of answering correctly despite not knowing the skill.
        p_slip: Probability of answering incorrectly despite knowing the skill.
        p_forget: Probability of transitioning from learned to unlearned.
                  In classical BKT this is usually fixed to 0.0.
    """
    p_init: float
    p_learn: float
    p_guess: float
    p_slip: float
    p_forget: float = 0.0

    def validate(self) -> None:
        """
        Validates that all probabilities are in the interval [0, 1].

        Raises:
            ValueError: If any parameter is outside the valid probability range.
        """
        for name, value in self.to_dict().items():
            if not (0.0 <= value <= 1.0):
                raise ValueError(f"{name} must be between 0 and 1, got {value}")

    def clipped(self, eps: float = 1e-6) -> "BKTParams":
        """
        Returns a new BKTParams object with all values clipped away
        from 0 and 1 to improve numerical stability.

        Args:
            eps: Small value used to clip probabilities.

        Returns:
            BKTParams: A new parameter object with clipped values.
        """
        return BKTParams(
            p_init=min(max(self.p_init, eps), 1 - eps),
            p_learn=min(max(self.p_learn, eps), 1 - eps),
            p_guess=min(max(self.p_guess, eps), 1 - eps),
            p_slip=min(max(self.p_slip, eps), 1 - eps),
            p_forget=min(max(self.p_forget, eps), 1 - eps),
        )

    def to_dict(self) -> dict:
        """
        Converts the parameter object into a dictionary.

        Returns:
            dict: Dictionary representation of the parameters.
        """
        return {
            "p_init": self.p_init,
            "p_learn": self.p_learn,
            "p_guess": self.p_guess,
            "p_slip": self.p_slip,
            "p_forget": self.p_forget,
        }