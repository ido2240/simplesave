"""Known-value tests for the PMT primitive (Excel parity)."""

from __future__ import annotations

import math

from simplesave.engine import pmt


def test_pmt_matches_excel() -> None:
    # Excel: PMT(0.05/12, 360, 1_000_000) = -5368.216230...
    assert math.isclose(pmt(0.05 / 12, 360, 1_000_000), -5368.216230, abs_tol=1e-4)


def test_pmt_zero_rate() -> None:
    # With no interest, payment is just principal spread evenly (negative sign).
    assert pmt(0.0, 12, 1200) == -100.0


def test_pmt_non_positive_n() -> None:
    assert pmt(0.05 / 12, 0, 1_000_000) == 0.0
    assert pmt(0.05 / 12, -5, 1_000_000) == 0.0
