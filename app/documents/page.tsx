import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
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
    return (<><AppHeader /><main className="mx-auto max-w-xl flex-1 px-5 py-20 text-center"><Link href="/new-mortgage" className="btn-primary px-6 py-3">התחל שאלון</Link></main><AppFooter /></>);
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
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12 sm:px-7">
        <p className="text-sm font-bold text-primary">שלב 3 · מסמכים</p>
        <h1 className="display mb-5 mt-2 text-4xl font-bold">העלאת מסמכים</h1>

        {locked ? (
          <div className="rounded-2xl border-2 border-dashed border-rule-strong bg-paper-2/50 p-7 text-center">
            <p className="mb-1 text-2xl">🔒</p>
            <p className="mb-4 text-ink-2">העלאת המסמכים נעולה עד לחתימה על כל כתבי ההרשאה.</p>
            <Link href="/authorizations" className="btn-primary px-6 py-3">לכתבי ההרשאה ←</Link>
          </div>
        ) : (
          <ul className="card divide-y divide-rule overflow-hidden rounded-2xl">
            {(docs ?? []).map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-bold">{doc.kind}</p>
                  {doc.file_name && <p className="num text-xs text-ink-3">{doc.file_name}</p>}
                  {doc.note && <p className="text-xs text-risk-high">הערת יועץ: {doc.note}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <DocStatusBadge status={doc.status} />
                  <form action={uploadDocument.bind(null, doc.id)} className="flex items-center gap-2">
                    <input
                      type="file"
                      name="file"
                      required
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      className="max-w-[150px] text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-paper-2 file:px-2 file:py-1 file:text-xs"
                    />
                    <button className="btn-ghost press px-3.5 py-1.5 text-sm">
                      {doc.status === "לא הועלה" ? "העלה" : "החלף"}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-6 text-xs text-ink-3">קבצי PDF/JPG/PNG עד 10MB. הקובץ נשמר באחסון מאובטח ועובר לסטטוס &quot;ממתין לבדיקה&quot; לבדיקת היועץ.</p>
      </main>
      <AppFooter />
    </>
  );
}
