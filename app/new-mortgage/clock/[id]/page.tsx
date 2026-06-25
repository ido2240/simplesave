import Link from "next/link";
import { notFound } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import RiskGauge from "@/components/RiskGauge";
import AmortizationChart, { type YearPoint } from "@/components/AmortizationChart";
import { requireRole } from "@/lib/session";
import { getActiveRequest } from "@/lib/requests";
import { computeOneClock } from "@/lib/engine-config";
import type { ClockResult } from "@/lib/engine";
import { shekel, pct } from "@/lib/format";
import { chooseClock } from "./actions";

const TRACK_LABEL: Record<string, string> = { fixed: "קבועה", variable: "משתנה", prime: "פריים" };

function yearlySchedule(clock: ClockResult): YearPoint[] {
  const months = clock.mix.maxN;
  const points: YearPoint[] = [];
  for (let y = 1; y <= Math.ceil(months / 12); y++) {
    let principal = 0;
    let interest = 0;
    for (let mo = (y - 1) * 12 + 1; mo <= y * 12 && mo <= months; mo++) {
      for (const r of clock.mix.per) {
        principal += r.prin[mo] ?? 0;
        interest += (r.intr[mo] ?? 0) + (r.idxEff[mo] ?? 0);
      }
    }
    points.push({ year: y, principal, interest });
  }
  return points;
}

export default async function ClockDetail({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ choose?: string }>;
}) {
  const user = await requireRole("client");
  const { id } = await params;
  const { choose } = await searchParams;
  const req = await getActiveRequest(user.id);
  if (!req?.details || req.details.loan_amount <= 0) notFound();

  const d = req.details;
  const clock = await computeOneClock(id, d.loan_amount, d.min_pay, d.max_pay);
  if (!clock) notFound();
  const data = yearlySchedule(clock);
  const m = clock.mix;

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8">
        <Link href="/new-mortgage/clocks" className="lbl hover:text-ember">→ חזרה לתמהילים</Link>
        <div className="mt-3 flex items-start justify-between gap-3">
          <h1 className="display text-4xl font-black">{clock.nameHe}</h1>
          <RiskGauge risk={clock.risk} size={120} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-y border-rule py-4 sm:grid-cols-4">
          <Stat label="החזר ראשון" value={shekel(m.firstPay)} />
          <Stat label="עלות כוללת" value={shekel(m.total)} />
          <Stat label="סך ריבית" value={shekel(m.interest)} />
          <Stat label="סך הצמדה" value={shekel(m.indexation)} />
        </div>

        <h2 className="display mt-8 mb-2 text-xl font-bold">קרן מול ריבית לאורך זמן</h2>
        <AmortizationChart data={data} />

        <h2 className="display mt-8 mb-3 text-xl font-bold">מסלולים</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead><tr className="lbl border-b-2 border-ink text-right">
              <th className="py-2">מסלול</th><th>חלק</th><th>שנים</th><th>ריבית</th><th>סכום</th>
            </tr></thead>
            <tbody>
              {clock.routes.map((rt, i) => (
                <tr key={i} className="border-b border-rule">
                  <td className="py-2">{TRACK_LABEL[rt.kind ?? "fixed"]}{rt.indexType === "מדד" ? " צמודה" : ""}</td>
                  <td className="num">{rt.sharePct}%</td>
                  <td className="num">{rt.years}</td>
                  <td className="num">{pct(rt.anchor + rt.margin)}</td>
                  <td className="num">{shekel(rt.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8">
          {choose ? (
            <form action={chooseClock.bind(null, clock.key)}>
              <button className="w-full bg-ember py-3 font-bold text-paper hover:opacity-90">שמור תמהיל זה והמשך לאזור האישי ←</button>
            </form>
          ) : (
            <Link href={`/new-mortgage/clock/${clock.key}?choose=1`} className="block bg-ink py-3 text-center font-bold text-paper hover:bg-ink-2">בחר תמהיל זה</Link>
          )}
        </div>
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div><p className="lbl">{label}</p><p className="num text-lg font-bold">{value}</p></div>;
}
