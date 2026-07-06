import Link from "next/link";
import { notFound } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import RiskGauge from "@/components/RiskGauge";
import TrackDonut, { DONUT_COLORS } from "@/components/TrackDonut";
import AmortizationChart, { type YearPoint } from "@/components/AmortizationChart";
import { CumulativeChart, MonthlyChart } from "@/components/PaymentCharts";
import PendingButton from "@/components/PendingButton";
import { requireRole } from "@/lib/session";
import { getActiveRequest } from "@/lib/requests";
import { computeOneClock } from "@/lib/engine-config";
import { displayRiskLabel } from "@/lib/display-risk";
import { annualRows, cumulativeSeries, monthlySeries } from "@/lib/schedule";
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
  searchParams: Promise<{ choose?: string; error?: string; tab?: string }>;
}) {
  const user = await requireRole("client");
  const { id } = await params;
  const { choose, error, tab } = await searchParams;
  const showTable = tab === "table";
  const req = await getActiveRequest(user.id);
  if (!req?.details || req.details.loan_amount <= 0) notFound();

  const d = req.details;
  const clock = await computeOneClock(id, d.loan_amount, d.min_pay, d.max_pay);
  if (!clock) notFound();
  const data = yearlySchedule(clock);
  const m = clock.mix;
  const cumulative = cumulativeSeries(m);
  const monthly = monthlySeries(m);
  const annual = annualRows(m);
  const qs = choose ? "?choose=1" : "";

  const tabIdle = "flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-bold text-ink-3 hover:text-ink";
  const tabActive = "flex-1 rounded-xl bg-white px-4 py-2.5 text-center text-sm font-bold text-primary shadow-sm";

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 sm:px-7">
        <Link href="/new-mortgage/clocks" className="lbl hover:text-primary">→ חזרה לתמהילים</Link>

        <div className="card mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-6">
          <div>
            <p className="text-sm font-bold text-primary">פירוט תמהיל</p>
            <h1 className="display mt-1 text-3xl font-bold sm:text-4xl">{clock.nameHe}</h1>
            {clock.subtitle && <p className="mt-1 text-sm text-ink-3">{clock.subtitle}</p>}
          </div>
          <RiskGauge score100={clock.displayRisk} label={displayRiskLabel(clock.displayRisk)} size={140} />
        </div>

        <div className="card mt-4 grid grid-cols-2 gap-4 rounded-2xl p-6 sm:grid-cols-4">
          <Stat label="החזר ראשון" value={shekel(m.firstPay)} />
          <Stat label="עלות כוללת" value={shekel(m.total)} />
          <Stat label="סך ריבית" value={shekel(m.interest)} />
          <Stat label="סך הצמדה" value={shekel(m.indexation)} />
        </div>

        {/* track composition — donut + legend (mockup) */}
        <div className="card mt-4 flex flex-wrap items-center gap-6 rounded-2xl p-6">
          <TrackDonut shares={clock.routes.map((rt) => rt.sharePct)} />
          <div className="min-w-[220px] flex-1 space-y-2.5">
            {clock.routes.map((rt, i) => (
              <div key={i} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-[4px]" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  {TRACK_LABEL[rt.kind ?? "fixed"]}{rt.indexType === "מדד" ? " צמודה" : ""}
                </span>
                <span className="num text-ink-2">{rt.sharePct}% · {rt.years} שנים · {pct(rt.anchor + rt.margin)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* charts ↔ table tabs (mockup) */}
        <div className="mt-4 flex gap-1.5 rounded-2xl bg-paper-2 p-1.5">
          <Link href={`/new-mortgage/clock/${clock.key}${qs}`} className={showTable ? tabIdle : tabActive}>גרפים</Link>
          <Link href={`/new-mortgage/clock/${clock.key}${qs}${qs ? "&" : "?"}tab=table`} className={showTable ? tabActive : tabIdle}>טבלה שנתית</Link>
        </div>

        {showTable ? (
          <div className="card mt-4 overflow-x-auto rounded-2xl p-6">
            <h2 className="display mb-3 text-xl font-bold">לוח סילוקין שנתי</h2>
            <table className="w-full min-w-[520px] text-sm">
              <thead><tr className="lbl border-b border-rule text-right">
                <th className="py-2">שנה</th><th>יתרת פתיחה</th><th>קרן ששולמה</th><th>ריבית והצמדה</th><th>יתרת סגירה</th>
              </tr></thead>
              <tbody>
                {annual.map((r) => (
                  <tr key={r.year} className={`border-b border-rule last:border-0 ${r.year % 2 === 0 ? "bg-paper" : ""}`}>
                    <td className="num py-2.5">{r.year}</td>
                    <td className="num">{shekel(r.open)}</td>
                    <td className="num">{shekel(r.principal)}</td>
                    <td className="num">{shekel(r.interest)}</td>
                    <td className="num">{shekel(r.close)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <div className="card mt-4 rounded-2xl p-6">
              <h2 className="display mb-3 text-xl font-bold">קרן מול ריבית לאורך זמן</h2>
              <AmortizationChart data={data} />
            </div>
            <div className="card mt-4 rounded-2xl p-6">
              <h2 className="display mb-1 text-xl font-bold">תשלומים מצטברים</h2>
              <p className="mb-3 text-sm text-ink-3">סה״כ ששולם מול הריבית וההצמדה המצטברות, שנה אחר שנה.</p>
              <CumulativeChart data={cumulative} />
            </div>
            <div className="card mt-4 rounded-2xl p-6">
              <h2 className="display mb-1 text-xl font-bold">החזר חודשי לאורך התקופה</h2>
              <p className="mb-3 text-sm text-ink-3">ההחזר יורד כשמסלולים קצרים מסתיימים — מחושב מלוח הסילוקין המלא.</p>
              <MonthlyChart data={monthly} />
            </div>
          </>
        )}

        <div className="card mt-4 overflow-x-auto rounded-2xl p-6">
          <h2 className="display mb-3 text-xl font-bold">מסלולים</h2>
          <table className="w-full min-w-[420px] text-sm">
            <thead><tr className="lbl border-b border-rule text-right">
              <th className="py-2">מסלול</th><th>חלק</th><th>שנים</th><th>ריבית</th><th>סכום</th>
            </tr></thead>
            <tbody>
              {clock.routes.map((rt, i) => (
                <tr key={i} className="border-b border-rule last:border-0">
                  <td className="py-2.5">{TRACK_LABEL[rt.kind ?? "fixed"]}{rt.indexType === "מדד" ? " צמודה" : ""}</td>
                  <td className="num">{rt.sharePct}%</td>
                  <td className="num">{rt.years}</td>
                  <td className="num">{pct(rt.anchor + rt.margin)}</td>
                  <td className="num">{shekel(rt.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          {error === "save" && (
            <div className="mb-4 rounded-xl border border-risk-high bg-[#fceeec] p-4 text-sm font-semibold text-risk-high">
              שמירת התמהיל נכשלה. נסו שוב.
            </div>
          )}
          {choose ? (
            <form action={chooseClock.bind(null, clock.key)}>
              <PendingButton className="btn-primary press w-full py-3.5 text-base" pendingLabel="שומר…">
                שמור תמהיל זה והמשך לאזור האישי ←
              </PendingButton>
            </form>
          ) : (
            <Link href={`/new-mortgage/clock/${clock.key}?choose=1`} className="btn-primary press block py-3.5 text-center text-base">בחר תמהיל זה</Link>
          )}
        </div>
      </main>
      <AppFooter />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div><p className="lbl">{label}</p><p className="display num text-lg font-bold">{value}</p></div>;
}
