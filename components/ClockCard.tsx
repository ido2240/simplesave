import Link from "next/link";
import type { ClockResult } from "@/lib/engine";
import { shekel, pct } from "@/lib/format";
import RiskGauge from "./RiskGauge";

const TRACK_LABEL: Record<string, string> = { fixed: "קבועה", variable: "משתנה", prime: "פריים" };
const CLOCK_LABEL: Record<string, string> = { clock1: "שעון 1", clock2: "שעון 2", clock3: "שעון 3", clock4: "שעון 4", clock5: "שעון 5" };

export default function ClockCard({
  clock, rank, recommended, base = "/new-mortgage", showActions = true,
}: {
  clock: ClockResult; rank: number; recommended?: boolean; base?: string; showActions?: boolean;
}) {
  const m = clock.mix;
  const principalPct = m.total > 0 ? m.principal / m.total : 0;

  return (
    <article className="flex flex-col border border-rule bg-paper-2/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="lbl">תמהיל {rank}</span>
            {recommended && <span className="bg-ember px-1.5 py-0.5 text-[10px] font-bold text-paper">מומלץ</span>}
            {clock.duplicateFlag && (
              <span className="border border-rule-strong px-1.5 py-0.5 text-[10px] text-ink-3">
                כפיל של {CLOCK_LABEL[clock.duplicateFlag] ?? clock.duplicateFlag}
              </span>
            )}
          </div>
          <h3 className="display mt-1 text-2xl font-bold">{clock.nameHe}</h3>
        </div>
        <RiskGauge risk={clock.risk} size={104} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-rule pt-4">
        <div><p className="lbl">החזר ראשון</p><p className="num text-lg font-bold">{shekel(m.firstPay)}</p></div>
        <div><p className="lbl">עלות כוללת</p><p className="num text-lg font-bold">{shekel(m.total)}</p></div>
        <div><p className="lbl">ריבית+הצמדה</p><p className="num text-lg font-bold">{shekel(m.interest + m.indexation)}</p></div>
      </div>

      <div className="mt-4">
        <div className="flex h-2 overflow-hidden bg-rule">
          <div className="bg-ink" style={{ width: `${principalPct * 100}%` }} />
        </div>
        <p className="lbl mt-1">קרן {pct(principalPct, 0)} · ריבית/הצמדה {pct(1 - principalPct, 0)}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {clock.routes.map((rt, i) => (
          <span key={i} className="border border-rule px-2 py-0.5 text-xs">
            {TRACK_LABEL[rt.kind ?? "fixed"]} {rt.sharePct}%{rt.indexType === "מדד" ? " צמודה" : ""}
          </span>
        ))}
      </div>

      {showActions && (
        <div className="mt-5 flex gap-2">
          <Link href={`${base}/clock/${clock.key}`} className="flex-1 border border-rule py-2 text-center text-sm hover:bg-paper-2">פירוט</Link>
          <Link href={`${base}/clock/${clock.key}?choose=1`} className="flex-1 bg-ink py-2 text-center text-sm font-bold text-paper hover:bg-ink-2">בחר</Link>
        </div>
      )}
    </article>
  );
}
