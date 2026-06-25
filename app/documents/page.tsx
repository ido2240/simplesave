import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import DocStatusBadge from "@/components/DocStatusBadge";
import { requireRole } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { getActiveRequest } from "@/lib/requests";
import { requirePaid } from "@/lib/billing";
import { uploadDocument } from "./actions";

export default async function DocumentsPage() {
  const user = await requireRole("client");
  const req = await getActiveRequest(user.id);
  if (!req) {
    return (<><AppHeader /><main className="mx-auto max-w-xl flex-1 px-5 py-20 text-center"><Link href="/new-mortgage" className="bg-ink px-5 py-2.5 font-bold text-paper">התחל שאלון</Link></main></>);
  }
  await requirePaid(req.id);

  const db = supabase();
  const [{ data: auths }, { data: docs }] = await Promise.all([
    db.from("authorizations").select("signed").eq("request_id", req.id),
    db.from("documents").select("id, kind, file_name, status, note").eq("request_id", req.id).order("kind"),
  ]);
  const locked = !((auths ?? []).length > 0 && (auths ?? []).every((a) => a.signed));

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">
        <p className="lbl mb-1">שלב 3 · מסמכים</p>
        <h1 className="display mb-2 text-4xl font-black">העלאת מסמכים</h1>

        {locked ? (
          <div className="border-2 border-dashed border-rule-strong bg-paper-2/40 p-6 text-center">
            <p className="mb-1 text-2xl">🔒</p>
            <p className="mb-3 text-ink-2">העלאת המסמכים נעולה עד לחתימה על כל כתבי ההרשאה.</p>
            <Link href="/authorizations" className="bg-ink px-5 py-2.5 font-bold text-paper">לכתבי ההרשאה ←</Link>
          </div>
        ) : (
          <ul className="divide-y divide-rule border-y border-rule">
            {(docs ?? []).map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-bold">{doc.kind}</p>
                  {doc.file_name && <p className="num text-xs text-ink-3">{doc.file_name}</p>}
                  {doc.note && <p className="text-xs text-brick">הערת יועץ: {doc.note}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <DocStatusBadge status={doc.status} />
                  <form action={uploadDocument.bind(null, doc.id)}>
                    <button className="border border-ink px-3 py-1.5 text-sm font-bold hover:bg-ink hover:text-paper">
                      {doc.status === "לא הועלה" ? "העלה" : "החלף"}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-6 text-xs text-ink-3">בהדגמה זו ההעלאה מדומה (ללא אחסון קובץ אמיתי). המסמך עובר לסטטוס &quot;ממתין לבדיקה&quot;.</p>
      </main>
    </>
  );
}
