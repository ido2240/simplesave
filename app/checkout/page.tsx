import AppHeader from "@/components/AppHeader";
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

export default async function CheckoutPage() {
  const user = await requireRole("client");
  const req = await getActiveRequest(user.id);
  const paid = req?.service_status === "PAID";

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 py-12">
        <p className="lbl mb-2">שדרוג לשירות המלא</p>
        <h1 className="display mb-2 text-4xl font-black">המשך לליווי מלא</h1>
        <p className="mb-6 text-ink-2">השאלון וחמשת השעונים — חינם. השירות המלא בתשלום חד-פעמי.</p>

        <div className="border-2 border-ink p-6">
          <div className="flex items-end justify-between border-b border-rule pb-4">
            <span className="display text-lg font-bold">SimpleSave מלא</span>
            <span className="num display text-3xl font-black">{shekel(SERVICE_PRICE_ILS)}</span>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {INCLUDED.map((x) => (<li key={x} className="flex gap-2"><span className="text-ember">✓</span> {x}</li>))}
          </ul>
          <div className="mt-6">
            {paid ? (
              <p className="font-bold text-forest">✓ השירות כבר פעיל בחשבונך.</p>
            ) : (
              <form action={startCheckout}>
                <button className="w-full bg-ember py-3 font-bold text-paper hover:opacity-90">המשך לתשלום ←</button>
              </form>
            )}
          </div>
        </div>
        <p className="mt-4 text-xs text-ink-3">הדגמה: ספק סליקה מדומה, ללא חיוב אמיתי וללא טופס כרטיס.</p>
      </main>
    </>
  );
}
