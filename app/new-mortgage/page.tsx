import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import NewMortgageForm, { type BorrowerSeed, type FormDefaults } from "@/components/NewMortgageForm";
import { requireRole } from "@/lib/session";
import { getActiveRequest } from "@/lib/requests";
import { supabaseServer } from "@/lib/supabase-server";

export default async function NewMortgagePage() {
  const user = await requireRole("client");
  const req = await getActiveRequest(user.id);
  const d = req?.details;

  let borrowers: BorrowerSeed[] = [];
  let additionalIncome = 0;
  let fixedExpenses = 0;
  if (req?.id) {
    const { data } = await (await supabaseServer())
      .from("borrowers")
      .select("full_name, birth_date, net_income, is_property_owner, additional_income, fixed_expenses")
      .eq("request_id", req.id);
    if (data?.length) {
      borrowers = data.map((b) => ({
        fullName: b.full_name || "",
        birthDate: b.birth_date || "1985-05-05",
        netIncome: b.net_income || 0,
        isOwner: b.is_property_owner ?? true,
      }));
      additionalIncome = data.reduce((s, b) => s + (b.additional_income || 0), 0);
      fixedExpenses = data.reduce((s, b) => s + (b.fixed_expenses || 0), 0);
    }
  }
  if (!borrowers.length) {
    // Default scenario must satisfy its own DTI validation: 30,000 ₪ net at a
    // 38% ratio gives an 11,400 ₪ capacity, above the default 10,000 ₪ max pay.
    borrowers = [{ fullName: user.name, birthDate: "1985-05-05", netIncome: 30000, isOwner: true }];
  }

  const defaults: FormDefaults = {
    propertyValue: d?.property_value || 2000000,
    equity: d?.equity || 500000,
    loanType: d?.loan_type || "single_property",
    propertySource: d?.property_source || "second_hand",
    termYears: d?.term_years || 25,
    minPay: d?.min_pay || 7000,
    maxPay: d?.max_pay || 10000,
    additionalIncome,
    fixedExpenses,
  };

  const paymentRatio = Number(process.env.PAYMENT_TO_INCOME_RATIO || 0.38);

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12">
        <div className="anim-fade mb-8 text-center">
          <p className="text-sm font-bold text-primary">משכנתא חדשה</p>
          <h1 className="display mt-2 text-4xl font-bold">בואו נמצא את התמהיל המושלם</h1>
          <p className="mt-2 text-ink-2">מלאו את הפרטים ונחשב עבורכם חמישה תמהילים מותאמים אישית.</p>
        </div>
        <NewMortgageForm defaults={defaults} borrowers={borrowers} paymentRatio={paymentRatio} />
      </main>
      <AppFooter />
    </>
  );
}
