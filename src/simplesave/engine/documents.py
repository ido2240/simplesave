"""Balance-report PDF reading — text extraction only (no fabricated routes).

CLAUDE.md §8: full bank-specific parsing needs the missing ``document-engine.js``.
Until it is restored we only extract raw text and detect which bank issued the report
(to drive the manual-entry hints in §nספח ב). We deliberately do **not** guess route
amounts/rates from the text — a wrong auto-filled route would corrupt the refinance
comparison. The client enters the routes manually for now.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from simplesave.engine.types import Route

# Keywords the real parser must locate per bank (CLAUDE.md / spec נספח ב).
BALANCE_REPORT_FIELDS: tuple[str, ...] = (
    "תאריך סיום",
    "החזר חודשי",
    "ריבית שנתית",
    "שיטת פירעון",
    "הצמדה למדד",
    "סוג ריבית",
    "עוגן",
    "יתרת קרן",
)

_BANK_HINTS = ("פועלים", "מזרחי", "לאומי", "דיסקונט", "הבינלאומי", "ירושלים", "מרכנתיל")


@dataclass
class BalanceReportParseResult:
    ok: bool
    routes: list[Route] = field(default_factory=list)
    total_balance: float = 0.0
    bank_hint: str = ""
    message: str = ""
    raw_text_preview: str = ""


def _extract_pdf_text(data: bytes, max_pages: int = 20) -> str:
    try:
        from pypdf import PdfReader
    except ImportError:
        return ""
    import io

    reader = PdfReader(io.BytesIO(data))
    chunks: list[str] = []
    for page in reader.pages[:max_pages]:
        chunks.append(page.extract_text() or "")
    return "\n".join(chunks)


def parse_balance_report_pdf(data: bytes) -> BalanceReportParseResult:
    """Read a bank balance report PDF.

    Returns ``ok=False`` with the extracted text preview and detected bank. It never
    invents routes — automatic field parsing is blocked until ``document-engine.js``
    is restored (CLAUDE.md §8). The caller should fall back to manual route entry.
    """
    text = _extract_pdf_text(data)
    if not text.strip():
        return BalanceReportParseResult(
            ok=False,
            message="לא ניתן לחלץ טקסט מה-PDF (ככל הנראה סרוק) — נדרשת הזנה ידנית.",
        )

    bank_hint = next((name for name in _BANK_HINTS if name in text), "")
    return BalanceReportParseResult(
        ok=False,
        routes=[],
        total_balance=0.0,
        bank_hint=bank_hint,
        message=(
            "פרסור אוטומטי של דוח היתרות אינו זמין עדיין (נדרש document-engine.js) — "
            "הזן את פרטי המסלולים ידנית."
        ),
        raw_text_preview=text[:500].replace("\n", " "),
    )


__all__ = ["BALANCE_REPORT_FIELDS", "BalanceReportParseResult", "parse_balance_report_pdf"]
