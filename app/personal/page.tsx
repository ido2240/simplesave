import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { requireRole } from "@/lib/session";
import { getActiveRequest } from "@/lib/requests";
import { computeOneClock } from "@/lib/engine-config";
import { shekel } from "@/lib/format";

export default async function PersonalPage() {
  const user = await requireRole("client");
  const req = await getActiveRequest(user.id);
  const d = req?.details;

  let chosen = null;
  if (req?.chosen_clock_id && d && d.loan_amount > 0) {
    chosen = await computeOneClock(req.chosen_clock_id, d.loan_amount, d.min_pay, d.max_pay);
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <p className="lbl mb-1">אזור אישי</p>
        <h1 className="display mb-6 text-4xl font-black">שלום, {user.name}</h1>

        {!d ? (
          <div className="border border-rule bg-paper-2/40 p-6 text-center">
            <p className="mb-4 text-ink-2">עוד לא מילאת שאלון משכנתא.</p>
            <Link href="/new-mortgage" className="bg-ink px-5 py-2.5 font-bold text-paper">התחל שאלון</Link>
          </div>
        ) : chosen ? (
          <div className="border-2 border-ink p-6">
            <div className="flex items-center justify-between">
              <p className="lbl">התמהיל הנבחר</p>
              <Link href={`/new-mortgage/clock/${chosen.key}`} className="text-sm underline hover:text-ember">פירוט</Link>
            </div>
            <h2 className="display mt-1 text-2xl font-bold">{chosen.nameHe}</h2>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div><p className="lbl">החזר ראשון</p><p className="num text-xl font-bold">{shekel(chosen.mix.firstPay)}</p></div>
              <div><p className="lbl">עלות כוללת</p><p className="num text-xl font-bold">{shekel(chosen.mix.total)}</p></div>
              <div><p className="lbl">סיכון</p><p className="num text-xl font-bold">{chosen.risk.label}</p></div>
            </div>
          </div>
        ) : (
          <div className="border border-rule bg-paper-2/40 p-6">
            <p className="mb-3 text-ink-2">עדיין לא בחרת תמהיל.</p>
            <Link href="/new-mortgage/clocks" className="bg-ink px-5 py-2.5 font-bold text-paper">בחר תמהיל ←</Link>
          </div>
        )}

        {d && req && req.service_status !== "PAID" && (
          <div className="mt-6 flex items-center justify-between gap-3 border border-ember bg-paper-2/60 p-4">
            <div>
              <p className="font-bold">שדרגו לשירות המלא</p>
              <p className="text-sm text-ink-3">כתבי הרשאה, מסמכים וליווי יועץ — בתשלום חד-פעמי.</p>
            </div>
            <Link href="/checkout" className="bg-ember px-4 py-2 text-sm font-bold text-paper hover:opacity-90">שדרג ←</Link>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <NextStep href="/new-mortgage/clocks" title="התמהילים" desc="חמשת השעונים שלך" />
          <NextStep href="/authorizations" title="כתבי הרשאה" desc="חתימה מול הבנקים" />
          <NextStep href="/documents" title="מסמכים" desc="העלאת מסמכים נדרשים" />
        </div>
      </main>
    </>
  );
}

function NextStep({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="border border-rule p-4 hover:bg-paper-2">
      <p className="font-bold">{title}</p>
      <p className="text-sm text-ink-3">{desc}</p>
    </Link>
  );
}
