"""
Parameter initialization for BKT training.

Why this file matters:
- EM is sensitive to starting values
- bad initialization can lead to poor local optima
- multi-start fitting is often better than a single start
"""

from __future__ import annotations

import random
from typing import List

from bkt.core.parameters import BKTParams
from .optimizer_utils import clip_params


def make_default_params(allow_forgetting: bool = False) -> BKTParams:
    """
    Return a simple default set of BKT parameters.

    These are not "correct" values.
    They are just reasonable starting points for EM.
    """
    return clip_params(
        BKTParams(
            p_init=0.20,   # initial probability student already knows the skill
            p_learn=0.10,  # probability of learning between two opportunities
            p_guess=0.20,  # probability of getting it correct while not knowing
            p_slip=0.10,   # probability of getting it wrong while knowing
            p_forget=0.01 if allow_forgetting else 0.0,
        ),
        allow_forgetting=allow_forgetting,
    )


def make_random_params(
    rng: random.Random | None = None,
    allow_forgetting: bool = False,
) -> BKTParams:
    """
    Create one random starting point for EM.

    The ranges are chosen to be plausible for educational data:
    - p_init: usually not too close to 0 or 1
    - p_learn: typically moderate
    - p_guess and p_slip: usually lower than 0.5
    """
    rng = rng or random.Random()

    params = BKTParams(
        p_init=rng.uniform(0.05, 0.50),
        p_learn=rng.uniform(0.01, 0.30),
        p_guess=rng.uniform(0.01, 0.30),
        p_slip=rng.uniform(0.01, 0.30),
        p_forget=rng.uniform(0.0, 0.10) if allow_forgetting else 0.0,
    )

    return clip_params(params, allow_forgetting=allow_forgetting)


def make_multi_start_params(
    n_starts: int,
    seed: int | None = None,
    allow_forgetting: bool = False,
) -> List[BKTParams]:
    """
    Build several starting points for multi-start EM.

    Strategy:
    - first start = stable default values
    - remaining starts = random values

    This is helpful because EM can get stuck in local optima.
    """
    if n_starts < 1:
        raise ValueError("n_starts must be at least 1")

    rng = random.Random(seed)
    starts = [make_default_params(allow_forgetting=allow_forgetting)]

    for _ in range(n_starts - 1):
        starts.append(
            make_random_params(rng=rng, allow_forgetting=allow_forgetting)
        )

    return starts