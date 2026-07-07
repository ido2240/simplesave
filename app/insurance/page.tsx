import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import InsuranceCompare from "@/components/InsuranceCompare";
import LeadCaptureCard from "@/components/LeadCaptureCard";
import { currentUser } from "@/lib/session";
import { getActiveRequest } from "@/lib/requests";
import { shekel } from "@/lib/format";

// Insurance comparison — owner-approved (2026-07-06) to ship with the mockup's
// demo factors, on the hard condition they are labeled estimated demo tariffs
// (NOT live insurer quotes) everywhere. Supersedes the earlier honest stub;
// real tariff tables can replace the factors without UI changes.
export default async function InsurancePage() {
  // Prefill from the signed-in client's loan when available; public page otherwise.
  let defaultSum = 1_100_000;
  const user = await currentUser();
  if (user?.role === "client") {
    const req = await getActiveRequest(user.id);
    if (req?.details?.loan_amount && req.details.loan_amount > 0) defaultSum = req.details.loan_amount;
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12 sm:px-7">
        <div className="mb-7 text-center">
          <p className="text-sm font-bold text-insurance">ביטוח משכנתא</p>
          <h1 className="display mt-2 text-4xl font-bold">השוואת ביטוח משכנתא</h1>
          <p className="mt-2 text-ink-2">חמש חברות, פרמיה ראשונה, ממוצעת וכוללת — והשוואה מול הפוליסה הקיימת שלכם.</p>
        </div>
        <InsuranceCompare defaultSum={defaultSum} />
        <LeadCaptureCard
          service="insurance"
          context={`סכום ביטוח ${shekel(defaultSum)}`}
          subtitle="רוצים הצעת מחיר אמיתית מהמבטחים? השאירו פרטים — יועץ ישווה עבורכם פוליסות ויחזור עם הצעה מחייבת."
        />
      </main>
      <AppFooter />
    </>
  );
}
