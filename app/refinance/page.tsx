import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import ClockCard from "@/components/ClockCard";
import RefiTracksForm from "@/components/RefiTracksForm";
import { toClockCardData } from "@/lib/clock-card-data";
import { computeClocks, loadMarketParams } from "@/lib/engine-config";
import { blankRoute, calcMix, mixRisk } from "@/lib/engine";
import { shekel } from "@/lib/format";
import { displayRiskLabel } from "@/lib/display-risk";

const field = "num w-full rounded-xl border border-rule-strong bg-paper px-3.5 py-2.5 outline-none focus:border-refi";

const GOALS: { value: string; label: string }[] = [
  { value: "savings", label: "חיסכון בסך ההחזרים" },
  { value: "lower_payment", label: "הקטנת החזר חודשי" },
  { value: "risk", label: "שינוי רמת סיכון" },
  { value: "shorter_term", label: "הקטנת תקופה" },
  { value: "consolidate", label: "איחוד הלוואות" },
];

const RISK_LABEL = ["", "נמוכה מאוד", "נמוכה", "בינונית", "גבוהה", "גבוהה מאוד"];

export default async function RefinancePage({
  searchParams,
}: {
  searchParams: Promise<{
    balance?: string; min?: string; max?: string; goal?: string;
    years?: string; rate?: string; indexed?: string;
  }>;
}) {
  const sp = await searchParams;
  const balance = Number(sp.balance || 0);
  const min = Number(sp.min || 0);
  const max = Number(sp.max || 0);
  const years = Number(sp.years || 0);
  const rate = Number(sp.rate || 0);
  const indexed = sp.indexed === "1";
  const goal = sp.goal || "savings";
  const goalLabel = GOALS.find((g) => g.value === goal)?.label ?? GOALS[0].label;
  const show = balance > 0 && min > 0 && max >= min && years > 0 && rate > 0;

  let clocks: Awaited<ReturnType<typeof computeClocks>> = [];
  let existing: { firstPay: number; total: number; interest: number; indexation: number; riskLevel: number } | null = null;

  if (show) {
    const params = await loadMarketParams();
    clocks = await computeClocks(balance, min, max);
    const route = blankRoute({
      amount: balance, years, anchor: rate / 100, kind: "fixed",
      indexType: indexed ? "מדד" : "ללא", indexPct: indexed ? 1 : 0,
    });
    const m = calcMix([route], params);
    const r = mixRisk([route]);
    existing = { firstPay: m.firstPay, total: m.total, interest: m.interest, indexation: m.indexation, riskLevel: r.level };
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-[1140px] flex-1 px-5 py-12 sm:px-7">
        <div className="mb-7 text-center">
          <p className="text-sm font-bold text-refi">מחזור משכנתא</p>
          <h1 className="display mt-2 text-4xl font-bold">בדיקת מחזור</h1>
          <p className="mt-2 text-ink-2">הזינו את פרטי המשכנתא הקיימת ומטרת המחזור — נחשב חמישה תמהילים חלופיים ונשווה אליהם.</p>
        </div>

        <RefiTracksForm
          defaults={[
            { balance: balance ? String(balance) : "650000", rateType: "fixed", rate: rate ? String(rate) : "4.9", endDate: "2039-06", linked: indexed },
            { balance: "450000", rateType: "prime", rate: "5.6", endDate: "2034-06", linked: false },
          ]}
          goals={GOALS}
          initialGoal={goal}
          initialMin={min || 5000}
          initialMax={max || 8000}
        />

        {show && existing && (
          <>
            <div className="mt-9 flex flex-wrap items-end justify-between gap-2">
              <h2 className="display text-2xl font-bold">השוואה: קיים מול חדש</h2>
              <p className="lbl">מטרה: {goalLabel}</p>
            </div>
            <div className="card mt-3 overflow-x-auto rounded-2xl">
              <table className="w-full min-w-[680px] text-right text-sm">
                <thead className="bg-paper-2">
                  <tr className="num">
                    <th className="px-3 py-2 text-right font-bold">תמהיל</th>
                    <th className="px-3 py-2 font-bold">החזר חודשי</th>
                    <th className="px-3 py-2 font-bold">סך תשלומים</th>
                    <th className="px-3 py-2 font-bold">ריבית</th>
                    <th className="px-3 py-2 font-bold">הצמדה</th>
                    <th className="px-3 py-2 font-bold">סיכון</th>
                    <th className="px-3 py-2 font-bold">חיסכון בסך</th>
                  </tr>
                </thead>
                <tbody className="num divide-y divide-rule">
                  <tr className="bg-paper-2 font-bold">
                    <td className="px-3 py-2">המשכנתא הקיימת</td>
                    <td className="px-3 py-2">{shekel(existing.firstPay)}</td>
                    <td className="px-3 py-2">{shekel(existing.total)}</td>
                    <td className="px-3 py-2">{shekel(existing.interest)}</td>
                    <td className="px-3 py-2">{shekel(existing.indexation)}</td>
                    <td className="px-3 py-2">{RISK_LABEL[existing.riskLevel] ?? existing.riskLevel}</td>
                    <td className="px-3 py-2">—</td>
                  </tr>
                  {clocks.map((c) => {
                    const saving = existing!.total - c.mix.total;
                    return (
                      <tr key={c.key}>
                        <td className="px-3 py-2">
                          {c.nameHe}
                          {c.recommended && <span className="mr-1 rounded bg-refi px-1.5 py-0.5 text-[10px] font-bold text-white">מומלץ</span>}
                        </td>
                        <td className="px-3 py-2">{shekel(c.mix.firstPay)}</td>
                        <td className="px-3 py-2">{shekel(c.mix.total)}</td>
                        <td className="px-3 py-2">{shekel(c.mix.interest)}</td>
                        <td className="px-3 py-2">{shekel(c.mix.indexation)}</td>
                        <td className="px-3 py-2">{displayRiskLabel(c.displayRisk)}</td>
                        <td className={`px-3 py-2 font-bold ${saving > 0 ? "text-refi" : "text-risk-high"}`}>
                          {saving > 0 ? shekel(saving) : `(${shekel(-saving)})`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-ink-3">חיסכון = סך התשלומים של המשכנתא הקיימת פחות סך התשלומים של התמהיל החלופי. חישוב במנוע מאומת; אינו מהווה ייעוץ משכנתאי.</p>

            <h2 className="display mb-3 mt-9 text-2xl font-bold">פירוט התמהילים החלופיים</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {clocks.map((c, i) => (<ClockCard key={c.key} clock={toClockCardData(c)} rank={i + 1} recommended={c.recommended} showActions={false} />))}
            </div>
          </>
        )}
      </main>
      <AppFooter />
    </>
  );
}
