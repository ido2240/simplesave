import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
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
          <p className="mb-5 text-ink-2">עדיין אין נתוני משכנתא תקינים. בדקו את ההון העצמי מול שווי הנכס.</p>
          <Link href="/new-mortgage" className="btn-primary px-6 py-3">חזרה לשאלון</Link>
        </main>
        <AppFooter />
      </>
    );
  }

  const d = req.details;
  const clocks = await computeClocks(d.loan_amount, d.min_pay, d.max_pay);

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-[1240px] flex-1 px-5 py-12 sm:px-7">
        <div className="anim-fade mb-9 text-center">
          <p className="text-sm font-bold text-primary">משכנתא חדשה · התוצאות שלכם</p>
          <h1 className="display mt-2 text-4xl font-bold sm:text-5xl">השעונים שלכם</h1>
          <p className="mt-2 text-ink-2">
            כל שעון מייצג תמהיל משכנתא. בחרו את המתאים לכם, או פתחו ״פירוט״ לניתוח מעמיק.
          </p>
          <p className="num mt-3 text-sm text-ink-3">
            הלוואה {shekel(d.loan_amount)} · החזר רצוי {shekel(d.min_pay)}–{shekel(d.max_pay)} ·{" "}
            <Link href="/new-mortgage" className="font-semibold text-primary underline">עריכה</Link>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {clocks.map((c, i) => (
            <ClockCard key={c.key} clock={c} rank={i + 1} recommended={c.recommended} />
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-ink-3">
          חישוב במנוע מאומת מול הסימולטור המקורי. הצגה לצרכי הדגמה בלבד.
        </p>
      </main>
      <AppFooter />
    </>
  );
}
