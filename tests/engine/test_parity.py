"""JS↔Python parity check for the calculation engine (CLAUDE.md §3).

Runs an identical battery of route configs through the reference JavaScript
(executed verbatim in Node via ``tests/oracle/run_oracle.js``) and through the
Python port, and asserts the numbers match. Skipped automatically if Node is
not installed.
"""

from __future__ import annotations

import json
import math
import shutil
import subprocess
from pathlib import Path
from typing import Any

import pytest

from tests.oracle.battery import build_battery, py_run_case

ORACLE = Path(__file__).resolve().parents[1] / "oracle" / "run_oracle.js"
NODE = shutil.which("node")

pytestmark = pytest.mark.skipif(
    NODE is None, reason="Node.js not installed; parity oracle unavailable"
)

REL_TOL = 1e-9
ABS_TOL = 1e-9


def _run_oracle(cases: list[dict[str, Any]]) -> list[dict[str, Any]]:
    assert NODE is not None
    proc = subprocess.run(
        [NODE, str(ORACLE)],
        input=json.dumps({"cases": cases}),
        capture_output=True,
        text=True,
        timeout=120,
    )
    if proc.returncode != 0:
        raise AssertionError(f"oracle failed (rc={proc.returncode}):\n{proc.stderr}")
    result = json.loads(proc.stdout)
    return result["results"]


def _assert_close(path: str, a: Any, b: Any) -> None:
    """Recursively assert two oracle/python result values are equal."""
    if isinstance(a, bool) or isinstance(b, bool):
        assert bool(a) == bool(b), f"{path}: {a!r} != {b!r}"
    elif isinstance(a, (int, float)) and isinstance(b, (int, float)):
        assert math.isclose(a, b, rel_tol=REL_TOL, abs_tol=ABS_TOL), f"{path}: {a!r} != {b!r}"
    elif isinstance(a, list) and isinstance(b, list):
        assert len(a) == len(b), f"{path}: length {len(a)} != {len(b)}"
        for i, (x, y) in enumerate(zip(a, b, strict=True)):
            _assert_close(f"{path}[{i}]", x, y)
    elif isinstance(a, dict) and isinstance(b, dict):
        assert a.keys() == b.keys(), f"{path}: keys {a.keys()} != {b.keys()}"
        for k in a:
            _assert_close(f"{path}.{k}", a[k], b[k])
    else:
        assert a == b, f"{path}: {a!r} != {b!r}"


@pytest.fixture(scope="module")
def battery() -> list[dict[str, Any]]:
    return build_battery()


@pytest.fixture(scope="module")
def oracle_results(battery: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return _run_oracle(battery)


def test_battery_is_substantial(battery: list[dict[str, Any]]) -> None:
    # Guard against an empty/trivial battery silently passing.
    kinds = {c["type"] for c in battery}
    assert kinds == {"route", "mix", "risk", "tune"}
    assert len(battery) >= 100


def test_python_matches_oracle(
    battery: list[dict[str, Any]], oracle_results: list[dict[str, Any]]
) -> None:
    assert len(oracle_results) == len(battery)
    for i, (case, oracle) in enumerate(zip(battery, oracle_results, strict=True)):
        py = py_run_case(case)
        _assert_close(f"case[{i}]({case['type']})", oracle, py)
