import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import ClockCard from "@/components/ClockCard";
import { requireRole } from "@/lib/session";
import { getActiveRequest } from "@/lib/requests";
import { computeClocks } from "@/lib/engine-config";
import { shekel } from "@/lib/format";

export default async function ClocksPage() {
  const user = await requireRole("client");
  const req = await getActiveRequest(user.id);

  if (!req?.details || req.details.loan_amount <= 0) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto max-w-xl flex-1 px-5 py-20 text-center">
          <p className="mb-4 text-ink-2">עדיין אין נתוני משכנתא תקינים. בדקו את ההון העצמי מול שווי הנכס.</p>
          <Link href="/new-mortgage" className="bg-ink px-5 py-2.5 font-bold text-paper">חזרה לשאלון</Link>
        </main>
      </>
    );
  }

  const d = req.details;
  const clocks = await computeClocks(d.loan_amount, d.min_pay, d.max_pay);

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-[1140px] flex-1 px-5 py-8">
        <div className="masthead-rule mb-5" />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="lbl mb-1">חמשת השעונים</p>
            <h1 className="display text-4xl font-black">התמהילים שלך</h1>
          </div>
          <p className="num text-sm text-ink-2">
            הלוואה {shekel(d.loan_amount)} · החזר רצוי {shekel(d.min_pay)}–{shekel(d.max_pay)} ·{" "}
            <Link href="/new-mortgage" className="underline hover:text-ember">עריכה</Link>
          </p>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {clocks.map((c, i) => (
            <ClockCard key={c.key} clock={c} rank={i + 1} recommended={c.recommended} />
          ))}
        </div>

        <p className="mt-8 text-xs text-ink-3">חישוב במנוע מאומת מול הסימולטור המקורי. הצגה לצרכי הדגמה בלבד.</p>
      </main>
    </>
  );
}
