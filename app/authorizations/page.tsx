import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { requireRole } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { getActiveRequest } from "@/lib/requests";
import { requirePaid } from "@/lib/billing";
import { signAuthorization } from "./actions";

export default async function AuthorizationsPage() {
  const user = await requireRole("client");
  const req = await getActiveRequest(user.id);
  if (!req) {
    return (<><AppHeader /><main className="mx-auto max-w-xl flex-1 px-5 py-20 text-center"><Link href="/new-mortgage" className="bg-ink px-5 py-2.5 font-bold text-paper">התחל שאלון</Link></main></>);
  }
  await requirePaid(req.id);

  const { data: auths } = await supabase()
    .from("authorizations").select("id, bank, signed").eq("request_id", req.id).order("bank");
  const list = auths ?? [];
  const signed = list.filter((a) => a.signed).length;
  const allSigned = list.length > 0 && signed === list.length;

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">
        <p className="lbl mb-1">שלב 2 · ייפוי כוח</p>
        <h1 className="display mb-2 text-4xl font-black">כתבי הרשאה</h1>
        <p className="mb-6 text-ink-2">חתמו על ייפוי כוח מול כל בנק. העלאת המסמכים תיפתח לאחר חתימה על כל הכתבים.</p>

        <div className="mb-6 flex items-center gap-3">
          <div className="h-2 flex-1 bg-rule"><div className="h-2 bg-forest" style={{ width: `${list.length ? (signed / list.length) * 100 : 0}%` }} /></div>
          <span className="num lbl">{signed}/{list.length}</span>
        </div>

        <ul className="divide-y divide-rule border-y border-rule">
          {list.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-3">
              <span className="font-bold">{a.bank}</span>
              {a.signed ? (
                <span className="text-sm font-bold text-forest">✓ נחתם</span>
              ) : (
                <form action={signAuthorization.bind(null, a.id)}>
                  <button className="border border-ink px-3 py-1.5 text-sm font-bold hover:bg-ink hover:text-paper">חתום</button>
                </form>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-8">
          {allSigned ? (
            <Link href="/documents" className="inline-block bg-ember px-5 py-2.5 font-bold text-paper">המשך להעלאת מסמכים ←</Link>
          ) : (
            <p className="text-sm text-ink-3">יש לחתום על כל כתבי ההרשאה כדי להמשיך.</p>
          )}
        </div>
      </main>
    </>
  );
}
