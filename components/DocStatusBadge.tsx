const STYLE: Record<string, string> = {
  "לא הועלה": "text-ink-3 border-rule",
  "ממתין לבדיקה": "text-ochre border-ochre",
  "תקין": "text-forest border-forest",
  "דרוש תיקון": "text-brick border-brick",
};

export default function DocStatusBadge({ status }: { status: string }) {
  return (
    <span className={`border px-2 py-0.5 text-xs font-bold ${STYLE[status] ?? "text-ink-3 border-rule"}`}>
      {status}
    </span>
  );
}
