"""Tests for five-clock generation."""

from simplesave.engine.clocks import (
    _CLOCK_ROUTE_SPECS,
    CLOCK_DUPLICATE_FLAGS,
    CLOCK_KEYS,
    generate_all_clocks,
)
from simplesave.engine.types import MarketParams


def test_generate_all_clocks_count() -> None:
    clocks = generate_all_clocks(
        loan=1_000_000,
        min_pay=5_000,
        max_pay=8_000,
        params=MarketParams(),
    )
    assert len(clocks) == 5
    assert all(c.mix.first_pay > 0 for c in clocks)


def test_duplicate_clock_templates_are_flagged() -> None:
    """CLAUDE.md §4: reference duplicates are allowed as defaults, but any clock
    whose composition matches another must carry a duplicate flag (never shipped
    silently). Once the client signs off on 5 distinct strategies (D-1/D-2),
    the flags map should be empty again."""
    seen: dict[str, str] = {}
    for key in CLOCK_KEYS:
        spec = repr(_CLOCK_ROUTE_SPECS[key])
        if spec in seen:
            assert key in CLOCK_DUPLICATE_FLAGS, (
                f"{key} duplicates {seen[spec]} but is not flagged"
            )
        else:
            seen[spec] = key


def test_clock_shares_sum_to_100() -> None:
    for key in CLOCK_KEYS:
        total = sum(s["share_pct"] for s in _CLOCK_ROUTE_SPECS[key])
        assert total == 100, f"{key} shares sum to {total}, not 100"
