import AppHeader from "@/components/AppHeader";
import { requireRole } from "@/lib/session";
import { getActiveRequest } from "@/lib/requests";
import { saveNewMortgage } from "./actions";

const field = "num w-full border border-rule bg-paper-2 px-3 py-2.5 outline-none focus:border-ink";

export default async function NewMortgagePage() {
  const user = await requireRole("client");
  const req = await getActiveRequest(user.id);
  const d = req?.details;

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">
        <p className="lbl mb-2">משכנתא חדשה</p>
        <h1 className="display mb-2 text-4xl font-black">שאלון</h1>
        <p className="mb-8 text-ink-2">מלאו את הפרטים ונחשב עבורכם חמישה תמהילים.</p>

        <form action={saveNewMortgage} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <label className="block"><span className="lbl mb-1 block">שווי הנכס (₪)</span>
            <input name="propertyValue" type="number" defaultValue={d?.property_value || 2000000} className={field} /></label>
          <label className="block"><span className="lbl mb-1 block">הון עצמי (₪)</span>
            <input name="equity" type="number" defaultValue={d?.equity || 500000} className={field} /></label>
          <label className="block"><span className="lbl mb-1 block">סוג נכס</span>
            <select name="loanType" defaultValue={d?.loan_type || "single_property"} className={field}>
              <option value="single_property">נכס יחיד</option>
              <option value="additional_property">נכס נוסף</option>
              <option value="all_purpose">לכל מטרה</option>
              <option value="improvement">שיפור דיור</option>
            </select></label>
          <label className="block"><span className="lbl mb-1 block">מקור הנכס</span>
            <select name="propertySource" defaultValue={d?.property_source || "second_hand"} className={field}>
              <option value="second_hand">יד 2</option>
              <option value="contractor">קבלן</option>
              <option value="target_price">מחיר למשתכן</option>
              <option value="self_build">בנייה עצמית</option>
            </select></label>
          <label className="block"><span className="lbl mb-1 block">תקופה (שנים)</span>
            <input name="termYears" type="number" min={4} max={30} defaultValue={d?.term_years || 25} className={field} /></label>
          <label className="block"><span className="lbl mb-1 block">תאריך לידה</span>
            <input name="birthDate" type="date" defaultValue="1985-05-05" dir="ltr" className={field} /></label>
          <label className="block"><span className="lbl mb-1 block">הכנסה נטו חודשית (₪)</span>
            <input name="netIncome" type="number" defaultValue={14000} className={field} /></label>
          <div className="hidden sm:block" />
          <label className="block"><span className="lbl mb-1 block">החזר חודשי רצוי — מ- (₪)</span>
            <input name="minPay" type="number" defaultValue={d?.min_pay || 7000} className={field} /></label>
          <label className="block"><span className="lbl mb-1 block">עד- (₪)</span>
            <input name="maxPay" type="number" defaultValue={d?.max_pay || 10000} className={field} /></label>
          <div className="sm:col-span-2">
            <button className="w-full bg-ink py-3 font-bold text-paper hover:bg-ink-2">חשב חמישה תמהילים ←</button>
          </div>
        </form>
      </main>
    </>
  );
}
