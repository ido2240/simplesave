import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { requireRole } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase-server";
import { getActiveRequest } from "@/lib/requests";
import { requirePaid } from "@/lib/billing";

// Bank tender (mockup: אישור עקרוני — מכרז בנקים): approved banks lit with
// their weighted offered rate; pending banks dashed. Offers are entered by
// the advisor/manager — the client sees live status.
export default async function TenderPage() {
  const user = await requireRole("client");
  const req = await getActiveRequest(user.id);
  if (!req) {
    return (<><AppHeader /><main className="mx-auto max-w-xl flex-1 px-5 py-20 text-center"><Link href="/new-mortgage" className="btn-primary px-6 py-3">התחל שאלון</Link></main><AppFooter /></>);
  }
  await requirePaid(req.id);

  const { data: offers } = await (await supabaseServer())
    .from("bank_offers")
    .select("id, bank, note, rate_pct, approved, is_best")
    .eq("request_id", req.id)
    .order("is_best", { ascending: false })
    .order("rate_pct", { ascending: true, nullsFirst: false });
  const list = offers ?? [];
  const approvedCount = list.filter((o) => o.approved).length;

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12 sm:px-7">
        <p className="text-sm font-bold text-primary">שלב 4 · אישור עקרוני</p>
        <h1 className="display mb-2 mt-2 text-4xl font-bold">מכרז בנקים</h1>
        <p className="mb-6 text-ink-2">
          הבנקים שאישרו את הבקשה מוארים; הבנק עם התנאים הטובים ביותר מסומן. הריבית המוצגת היא ריבית משוקללת להצעה.
        </p>

        {list.length === 0 ? (
          <div className="card rounded-2xl p-8 text-center">
            <p className="mb-2 text-ink-2">המכרז טרם נפתח — היועץ שלכם יפנה לבנקים לאחר בדיקת המסמכים.</p>
            <Link href="/documents" className="btn-primary mt-3 inline-flex px-6 py-3">לבדיקת המסמכים ←</Link>
          </div>
        ) : (
          <>
            <p className="lbl mb-3">{approvedCount} מתוך {list.length} בנקים אישרו</p>
            <ul className="space-y-3">
              {list.map((o) => (
                <li
                  key={o.id}
                  className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 ${
                    o.is_best
                      ? "border-2 border-primary bg-[#f2f5ff]"
                      : o.approved
                        ? "card"
                        : "border-[1.5px] border-dashed border-rule-strong bg-paper opacity-70"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-extrabold ${
                        o.approved ? "bg-gradient-to-br from-primary-2 to-primary-deep text-white" : "bg-paper-2 text-ink-3"
                      }`}
                    >
                      {o.bank.replace("בנק ", "").slice(0, 2)}
                    </span>
                    <div>
                      <p className={`font-bold ${o.approved ? "" : "text-ink-3"}`}>{o.bank}</p>
                      {o.note && <p className="text-xs text-ink-3">{o.note}</p>}
                    </div>
                  </div>
                  <div className="text-left">
                    {o.is_best && <p className="text-[11px] font-extrabold text-primary">★ ההצעה הטובה ביותר</p>}
                    <p className={`num text-lg font-bold ${o.is_best ? "text-primary" : "text-ink-2"}`}>
                      {o.rate_pct != null ? `${o.rate_pct.toFixed(2)}%` : "—"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="mt-8 flex gap-3">
          <Link href="/personal" className="btn-ghost press px-5 py-2.5 text-sm">לאזור האישי</Link>
          <Link href="/messages" className="btn-ghost press px-5 py-2.5 text-sm">שאלה ליועץ ←</Link>
        </div>
      </main>
      <AppFooter />
    </>
  );
}
