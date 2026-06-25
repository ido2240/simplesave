import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { requireRole } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { updateParams } from "../actions";

const field = "num w-28 border border-rule bg-paper-2 px-2 py-1 text-left outline-none focus:border-ink";

export default async function ParamsPage() {
  await requireRole("admin");
  const { data } = await supabase().from("economic_params").select("cpi, usd, eur, prime_rate").eq("id", "singleton").maybeSingle();
  const p = data ?? { cpi: 0.02, usd: 0.03, eur: 0.015, prime_rate: 0.0456 };
  const rows = [
    { name: "cpi", label: "מדד (צפי שנתי)", value: p.cpi },
    { name: "usd", label: "דולר", value: p.usd },
    { name: "eur", label: "אירו", value: p.eur },
    { name: "primeRate", label: "ריבית פריים", value: p.prime_rate },
  ];

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 py-10">
        <Link href="/admin" className="lbl hover:text-ember">→ חזרה לניהול</Link>
        <h1 className="display mt-2 mb-2 text-4xl font-black">פרמטרים כלכליים</h1>
        <p className="mb-6 text-ink-2">שינוי המדד משפיע מיידית על חישוב ההצמדה בחמשת השעונים.</p>
        <form action={updateParams} className="space-y-2">
          {rows.map((r) => (
            <div key={r.name} className="flex items-center justify-between border-b border-rule py-2">
              <span className="text-sm">{r.label}</span>
              <div className="flex items-center gap-1">
                <input name={r.name} type="number" step="0.01" defaultValue={(r.value * 100).toFixed(2)} className={field} dir="ltr" />
                <span className="lbl">%</span>
              </div>
            </div>
          ))}
          <button className="mt-4 w-full bg-ink py-2.5 font-bold text-paper hover:bg-ink-2">שמור</button>
        </form>
      </main>
    </>
  );
}
