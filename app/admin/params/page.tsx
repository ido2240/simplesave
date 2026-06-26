import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { requireRole } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase-server";
import { updateParams } from "../actions";

const field = "num w-28 rounded-lg border border-rule-strong bg-paper px-2.5 py-1.5 text-left outline-none focus:border-manager";

export default async function ParamsPage() {
  await requireRole("admin");
  const { data } = await (await supabaseServer())
    .from("economic_params")
    .select("cpi, usd, eur, prime_rate, fixed_anchor, variable_anchor")
    .eq("id", "singleton")
    .maybeSingle();
  const p = data ?? { cpi: 0.03, usd: 0.03, eur: 0.015, prime_rate: 0.0456, fixed_anchor: 0.0462, variable_anchor: 0.047 };
  const rows = [
    { name: "cpi", label: "מדד (צפי שנתי)", value: p.cpi },
    { name: "usd", label: "דולר", value: p.usd },
    { name: "eur", label: "אירו", value: p.eur },
    { name: "primeRate", label: "ריבית פריים", value: p.prime_rate },
    { name: "fixedAnchor", label: "ריבית קבועה (עוגן)", value: p.fixed_anchor },
    { name: "variableAnchor", label: "ריבית משתנה (עוגן)", value: p.variable_anchor },
  ];

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 py-8 sm:px-7">
        <Link href="/admin" className="lbl hover:text-manager">→ חזרה לניהול</Link>
        <h1 className="display mb-2 mt-2 text-4xl font-bold">פרמטרים כלכליים</h1>
        <p className="mb-6 text-ink-2">שינוי המדד משפיע מיידית על חישוב ההצמדה בחמשת השעונים.</p>
        <form action={updateParams} className="card rounded-2xl p-6">
          <div className="divide-y divide-rule">
            {rows.map((r) => (
              <div key={r.name} className="flex items-center justify-between py-3">
                <span className="text-sm">{r.label}</span>
                <div className="flex items-center gap-1.5">
                  <input name={r.name} type="number" step="0.01" defaultValue={(r.value * 100).toFixed(2)} className={field} dir="ltr" />
                  <span className="lbl">%</span>
                </div>
              </div>
            ))}
          </div>
          <button className="press mt-5 w-full rounded-xl bg-gradient-to-br from-manager to-[#5733b0] py-3 font-bold text-white">שמור</button>
        </form>
      </main>
      <AppFooter />
    </>
  );
}
