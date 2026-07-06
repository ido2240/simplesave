import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { requireRole } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase-server";
import { getActiveRequest } from "@/lib/requests";
import { requirePaid } from "@/lib/billing";
import PendingButton from "@/components/PendingButton";
import { signAuthorization } from "./actions";

export default async function AuthorizationsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireRole("client");
  const { error } = await searchParams;
  const req = await getActiveRequest(user.id);
  if (!req) {
    return (<><AppHeader /><main className="mx-auto max-w-xl flex-1 px-5 py-20 text-center"><Link href="/new-mortgage" className="btn-primary px-6 py-3">התחל שאלון</Link></main><AppFooter /></>);
  }
  await requirePaid(req.id);

  const { data: auths } = await (await supabaseServer())
    .from("authorizations").select("id, bank, signed").eq("request_id", req.id).order("bank");
  const list = auths ?? [];
  const signed = list.filter((a) => a.signed).length;
  const allSigned = list.length > 0 && signed === list.length;

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12 sm:px-7">
        <p className="text-sm font-bold text-primary">שלב 2 · ייפוי כוח</p>
        <h1 className="display mb-2 mt-2 text-4xl font-bold">כתבי הרשאה</h1>
        <p className="mb-6 text-ink-2">חתמו על ייפוי כוח מול כל בנק. העלאת המסמכים תיפתח לאחר חתימה על כל הכתבים.</p>

        {error === "sign" && (
          <div className="mb-5 rounded-xl border border-risk-high bg-[#fceeec] p-4 text-sm font-semibold text-risk-high">
            החתימה לא נקלטה. נסו שוב — אם הבעיה חוזרת, פנו אלינו.
          </div>
        )}

        <div className="mb-6 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-rule"><div className="h-2 rounded-full bg-refi" style={{ width: `${list.length ? (signed / list.length) * 100 : 0}%` }} /></div>
          <span className="num lbl">{signed}/{list.length}</span>
        </div>

        {list.length === 0 ? (
          <div className="card rounded-2xl p-8 text-center">
            <p className="mb-4 text-ink-2">כתבי ההרשאה לבקשה שלכם עדיין לא הופקו. חזרו לאזור האישי ונסו שוב, או פנו ליועץ.</p>
            <Link href="/personal" className="btn-primary px-6 py-3">לאזור האישי ←</Link>
          </div>
        ) : (
          <ul className="card divide-y divide-rule overflow-hidden rounded-2xl">
            {list.map((a) => (
              <li key={a.id} className="flex items-center justify-between p-4">
                <span className="font-bold">{a.bank}</span>
                {a.signed ? (
                  <span className="pill bg-[#e7f6ef] text-sm font-bold text-refi">✓ נחתם</span>
                ) : (
                  <form action={signAuthorization.bind(null, a.id)}>
                    <PendingButton className="btn-ghost press px-4 py-1.5 text-sm" pendingLabel="חותם…">חתום</PendingButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8">
          {allSigned ? (
            <Link href="/documents" className="btn-primary press inline-flex px-6 py-3">המשך להעלאת מסמכים ←</Link>
          ) : list.length > 0 ? (
            <p className="text-sm text-ink-3">יש לחתום על כל כתבי ההרשאה כדי להמשיך.</p>
          ) : null}
        </div>
      </main>
      <AppFooter />
    </>
  );
}
