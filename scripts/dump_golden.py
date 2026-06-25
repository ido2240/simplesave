"""Dump the Python engine's golden outputs for the TS parity gate.

Runs the shared battery (tests/oracle/battery.py) through the Python engine and
writes {cases, golden} to lib/engine/__tests__/golden.json. The TS parity test
loads this file and asserts its own engine matches — no hand-transcribed numbers.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT))

from tests.oracle.battery import build_battery, py_run_case  # noqa: E402

cases = build_battery()
golden = [py_run_case(c) for c in cases]

out = ROOT / "lib" / "engine" / "__tests__" / "golden.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps({"cases": cases, "golden": golden}, ensure_ascii=False), encoding="utf-8")
print(f"wrote {len(cases)} cases → {out.relative_to(ROOT)}")
