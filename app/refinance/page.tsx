import AppHeader from "@/components/AppHeader";
import ClockCard from "@/components/ClockCard";
import { computeClocks } from "@/lib/engine-config";
import { shekel } from "@/lib/format";

const field = "num w-full border border-rule bg-paper-2 px-3 py-2.5 outline-none focus:border-ink";

export default async function RefinancePage({
  searchParams,
}: {
  searchParams: Promise<{ balance?: string; min?: string; max?: string }>;
}) {
  const sp = await searchParams;
  const balance = Number(sp.balance || 0);
  const min = Number(sp.min || 0);
  const max = Number(sp.max || 0);
  const show = balance > 0 && min > 0 && max >= min;
  const clocks = show ? await computeClocks(balance, min, max) : [];

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-[1140px] flex-1 px-5 py-10">
        <p className="lbl mb-2">מחזור משכנתא</p>
        <h1 className="display mb-2 text-4xl font-black">בדיקת מחזור</h1>
        <p className="mb-6 text-ink-2">הזינו את יתרת המשכנתא הקיימת וטווח החזר רצוי — נחשב חמישה תמהילים חלופיים.</p>

        <form method="get" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="block"><span className="lbl mb-1 block">יתרת משכנתא (₪)</span>
            <input name="balance" type="number" defaultValue={balance || 1200000} className={field} /></label>
          <label className="block"><span className="lbl mb-1 block">החזר רצוי מ- (₪)</span>
            <input name="min" type="number" defaultValue={min || 5000} className={field} /></label>
          <label className="block"><span className="lbl mb-1 block">עד- (₪)</span>
            <input name="max" type="number" defaultValue={max || 8000} className={field} /></label>
          <div className="sm:col-span-3"><button className="w-full bg-ink py-3 font-bold text-paper hover:bg-ink-2">חשב תמהילים ←</button></div>
        </form>

        {show && (
          <>
            <p className="num mt-8 text-sm text-ink-2">יתרה {shekel(balance)} · החזר רצוי {shekel(min)}–{shekel(max)}</p>
            <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {clocks.map((c, i) => (<ClockCard key={c.key} clock={c} rank={i + 1} recommended={c.recommended} showActions={false} />))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
