import AppHeader from "@/components/AppHeader";

// Insurance comparison is BLOCKED until real tariff tables arrive (CLAUDE §8).
// We never fabricate premiums — honest "not available" instead.
const COMPANIES = ["הפניקס", "מגדל", "הראל", "כלל", "מנורה"];

export default function InsurancePage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">
        <p className="lbl mb-2">ביטוח משכנתא</p>
        <h1 className="display mb-4 text-4xl font-black">השוואת ביטוח</h1>

        <div className="border-2 border-dashed border-rule-strong bg-paper-2/40 p-6">
          <p className="mb-2 text-2xl">🔧</p>
          <p className="font-bold">השוואת ביטוח המשכנתא אינה זמינה עדיין.</p>
          <p className="mt-1 text-sm text-ink-2">
            המודול דורש את טבלאות התעריפים הרשמיות של חברות הביטוח. כדי לא להציג מספרים שגויים
            בהשוואה פיננסית, אנחנו לא ממציאים פרמיות — המודול ייפתח כשהטבלאות יסופקו.
          </p>
        </div>

        <h2 className="lbl mt-8 mb-2">חברות הביטוח שייכללו בהשוואה</h2>
        <div className="flex flex-wrap gap-2">
          {COMPANIES.map((c) => (<span key={c} className="border border-rule px-3 py-1 text-sm">{c}</span>))}
        </div>
      </main>
    </>
  );
}
