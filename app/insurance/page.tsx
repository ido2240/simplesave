import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";

// Insurance comparison is BLOCKED until real tariff tables arrive (CLAUDE §8).
// We never fabricate premiums — honest "not available" instead.
const COMPANIES = ["הפניקס", "מגדל", "הראל", "כלל", "מנורה"];

export default function InsurancePage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12 sm:px-7">
        <div className="mb-7 text-center">
          <p className="text-sm font-bold text-insurance">ביטוח משכנתא</p>
          <h1 className="display mt-2 text-4xl font-bold">השוואת ביטוח</h1>
        </div>

        <div className="rounded-2xl border-2 border-dashed border-[#f0debe] bg-[#fbf1e2]/60 p-7 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fbf1e2]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 3 5 6v5c0 4.4 3 8 7 10 4-2 7-5.6 7-10V6l-7-3Z" stroke="#d9820b" strokeWidth="2" strokeLinejoin="round" />
              <path d="M9 12l2 2 4-4" stroke="#d9820b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <p className="mt-4 font-bold text-[#8a5208]">השוואת ביטוח המשכנתא אינה זמינה עדיין.</p>
          <p className="mt-1.5 text-sm text-[#9a6a22]">
            המודול דורש את טבלאות התעריפים הרשמיות של חברות הביטוח. כדי לא להציג מספרים שגויים
            בהשוואה פיננסית, אנחנו לא ממציאים פרמיות — המודול ייפתח כשהטבלאות יסופקו.
          </p>
        </div>

        <h2 className="lbl mb-3 mt-8 text-center">חברות הביטוח שייכללו בהשוואה</h2>
        <div className="flex flex-wrap justify-center gap-2">
          {COMPANIES.map((c) => (
            <span key={c} className="rounded-full border border-rule bg-white px-4 py-1.5 text-sm font-medium text-ink-2">{c}</span>
          ))}
        </div>
      </main>
      <AppFooter />
    </>
  );
}
