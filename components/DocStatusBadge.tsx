const STYLE: Record<string, string> = {
  "לא הועלה": "text-ink-3 bg-paper-2",
  "ממתין לבדיקה": "text-risk-mid bg-[#fbf1e2]",
  תקין: "text-risk-low bg-[#e7f6ef]",
  "דרוש תיקון": "text-risk-high bg-[#fceeec]",
};

export default function DocStatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STYLE[status] ?? "text-ink-3 bg-paper-2"}`}>
      {status}
    </span>
  );
}
