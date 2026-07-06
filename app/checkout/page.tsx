import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import PendingButton from "@/components/PendingButton";
import { requireRole } from "@/lib/session";
import { getActiveRequest } from "@/lib/requests";
import { shekel } from "@/lib/format";
import { SERVICE_PRICE_ILS } from "@/lib/billing";
import { startCheckout } from "./actions";

const INCLUDED = [
  "ליווי יועץ אישי עד החתימה",
  "כתבי הרשאה דיגיטליים לכל הבנקים",
  "העלאת מסמכים ובדיקתם",
  "משא ומתן על הריבית מול הבנקים",
];

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireRole("client");
  const { error } = await searchParams;
  const req = await getActiveRequest(user.id);
  const paid = req?.service_status === "PAID";

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 py-12 sm:px-7">
        <div className="mb-7 text-center">
          <p className="text-sm font-bold text-primary">שדרוג לשירות המלא</p>
          <h1 className="display mt-2 text-4xl font-bold">המשך לליווי מלא</h1>
          <p className="mt-2 text-ink-2">השאלון וחמשת השעונים — חינם. השירות המלא בתשלום חד-פעמי.</p>
        </div>

        {error === "payment" && !paid && (
          <div className="mb-5 rounded-xl border border-risk-high bg-[#fceeec] p-4 text-sm font-semibold text-risk-high">
            התשלום לא הושלם. נסו שוב — אם הבעיה חוזרת, פנו אלינו ונעזור.
          </div>
        )}

        <div className="card rounded-2xl border-2 border-primary p-7">
          <div className="flex items-end justify-between border-b border-rule pb-4">
            <span className="display text-lg font-bold">SimpleSave מלא</span>
            <span className="num display text-3xl font-bold text-primary">{shekel(SERVICE_PRICE_ILS)}</span>
          </div>
          <ul className="mt-4 space-y-2.5 text-sm">
            {INCLUDED.map((x) => (
              <li key={x} className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e7f6ef] text-xs text-refi">✓</span> {x}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            {paid ? (
              <div className="space-y-3">
                <p className="pill bg-[#e7f6ef] font-bold text-refi">✓ השירות כבר פעיל בחשבונך.</p>
                <Link href="/authorizations" className="btn-primary press block w-full py-3.5 text-center">המשך לכתבי הרשאה ←</Link>
                <Link href="/personal" className="btn-ghost press block w-full py-2.5 text-center text-sm">לאזור האישי</Link>
              </div>
            ) : (
              <form action={startCheckout}>
                <PendingButton className="btn-primary press w-full py-3.5 text-base" pendingLabel="מעביר לעמוד התשלום…">
                  המשך לתשלום ←
                </PendingButton>
              </form>
            )}
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-ink-3">
          תשלום דמו (Sandbox): ספק סליקה לבדיקה בלבד, ללא חיוב אמיתי. בפרודקשן ישולב ספק סליקה מאושר.
        </p>
      </main>
      <AppFooter />
    </>
  );
}
