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
    <article
      className={`card lift relative flex flex-col rounded-2xl p-5 ${recommended ? "border-2 border-primary" : ""}`}
    >
      {recommended && (
        <span className="anim-pulse absolute -top-3 right-1/2 translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-l from-primary-2 to-primary-deep px-3.5 py-1 text-[11.5px] font-extrabold text-white">
          ★ הכי משתלם
        </span>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="lbl">תמהיל {rank}</span>
        {clock.duplicateFlag && (
          <span className="rounded-md border border-rule-strong px-1.5 py-0.5 text-[10px] text-ink-3">
            כפיל של {CLOCK_LABEL[clock.duplicateFlag] ?? clock.duplicateFlag}
          </span>
        )}
      </div>
      <h3 className="display mt-1 text-2xl font-bold">{clock.nameHe}</h3>

      <div className="mt-3 flex justify-center">
        <RiskGauge risk={clock.risk} size={150} />
      </div>

      {/* stat block */}
      <div className="mt-3 flex flex-col gap-2.5 rounded-2xl bg-paper p-3.5">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-ink-3">החזר ראשון</span>
          <span className="display num text-xl font-bold">{shekel(m.firstPay)}</span>
        </div>
        <div className="h-px bg-rule" />
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-ink-3">סה״כ תשלומים</span>
          <span className="num text-sm font-bold text-ink-2">{shekel(m.total)}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-ink-3">מזה ריבית והצמדה</span>
          <span className="num text-sm font-bold text-ink-2">{shekel(m.interest + m.indexation)}</span>
        </div>
      </div>

      {/* principal / interest split */}
      <div className="mt-3">
        <div className="flex h-2 overflow-hidden rounded-md bg-rule">
          <div className="rounded-md bg-primary" style={{ width: `${principalPct * 100}%` }} />
        </div>
        <p className="lbl mt-1.5">קרן {pct(principalPct, 0)} · ריבית/הצמדה {pct(1 - principalPct, 0)}</p>
      </div>

      {/* route chips */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {clock.routes.map((rt, i) => (
          <span key={i} className="rounded-md border border-rule bg-paper px-2 py-0.5 text-xs text-ink-2">
            {TRACK_LABEL[rt.kind ?? "fixed"]} {rt.sharePct}%{rt.indexType === "מדד" ? " צמודה" : ""}
          </span>
        ))}
      </div>

      {showActions && (
        <div className="mt-5 flex gap-2">
          <Link href={`${base}/clock/${clock.key}?choose=1`} className="btn-primary press flex-1 py-2.5 text-center text-sm">
            בחר תמהיל
          </Link>
          <Link href={`${base}/clock/${clock.key}`} className="btn-ghost press px-3.5 py-2.5 text-center text-sm">
            פירוט ‹
          </Link>
        </div>
      )}
    </article>
  );
}
