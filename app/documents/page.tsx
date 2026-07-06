import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import DocStatusBadge from "@/components/DocStatusBadge";
import DocUploadForm from "@/components/DocUploadForm";
import { requireRole } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase-server";
import { getActiveRequest } from "@/lib/requests";
import { requirePaid } from "@/lib/billing";

// Mockup 6-item checklist: 5 uploadable document rows + כתבי הסמכה, whose
// status derives live from the authorizations screen.
export default async function DocumentsPage() {
  const user = await requireRole("client");
  const req = await getActiveRequest(user.id);
  if (!req) {
    return (<><AppHeader /><main className="mx-auto max-w-xl flex-1 px-5 py-20 text-center"><Link href="/new-mortgage" className="btn-primary px-6 py-3">התחל שאלון</Link></main><AppFooter /></>);
  }
  await requirePaid(req.id);

  const db = await supabaseServer();
  const [{ data: auths }, { data: docs }] = await Promise.all([
    db.from("authorizations").select("signed").eq("request_id", req.id),
    db.from("documents").select("id, kind, file_name, status, note, required").eq("request_id", req.id).order("required", { ascending: false }).order("kind"),
  ]);
  const authList = auths ?? [];
  const allSigned = authList.length > 0 && authList.every((a) => a.signed);
  const locked = !allSigned;
  const docList = docs ?? [];
  const approved = docList.filter((d) => d.status === "תקין").length + (allSigned ? 1 : 0);
  const totalItems = docList.length + 1; // + the authorizations item

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12 sm:px-7">
        <p className="text-sm font-bold text-primary">שלב 3 · מסמכים</p>
        <h1 className="display mb-2 mt-2 text-4xl font-bold">רשימת מסמכים</h1>

        <div className="mb-6 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-rule">
            <div className="h-2 rounded-full bg-refi" style={{ width: `${totalItems ? (approved / totalItems) * 100 : 0}%` }} />
          </div>
          <span className="num lbl">{approved} מתוך {totalItems} אושרו</span>
        </div>

        <ul className="card divide-y divide-rule overflow-hidden rounded-2xl">
          {/* item 1 — כתבי הסמכה, derived from the authorizations flow */}
          <li className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-bold">כתבי הסמכה</p>
              <p className="text-xs text-ink-3">נדרש לחתימה — מאפשר עבודה מול הבנקים</p>
            </div>
            {allSigned ? (
              <span className="pill bg-[#e7f6ef] text-sm font-bold text-refi">✓ נחתם</span>
            ) : (
              <Link href="/authorizations" className="btn-ghost press px-4 py-1.5 text-sm">לחתימה ←</Link>
            )}
          </li>

          {locked ? (
            <li className="p-7 text-center">
              <p className="mb-1 text-2xl">🔒</p>
              <p className="mb-4 text-ink-2">העלאת המסמכים נעולה עד לחתימה על כל כתבי ההרשאה.</p>
              <Link href="/authorizations" className="btn-primary px-6 py-3">לכתבי ההרשאה ←</Link>
            </li>
          ) : (
            docList.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-bold">
                    {doc.kind}
                    {!doc.required && <span className="mr-2 rounded-md border border-rule px-1.5 py-0.5 text-[10px] font-medium text-ink-3">לא חובה בשלב זה</span>}
                  </p>
                  {doc.file_name && <p className="num text-xs text-ink-3">{doc.file_name}</p>}
                  {doc.note && <p className="text-xs text-risk-high">הערת יועץ: {doc.note}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <DocStatusBadge status={doc.status} />
                  <DocUploadForm docId={doc.id} kind={doc.kind} status={doc.status} />
                </div>
              </li>
            ))
          )}
        </ul>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-3">קבצי PDF/JPG/PNG עד 10MB. הקובץ נשמר באחסון מאובטח ועובר לבדיקת היועץ.</p>
          <Link href="/tender" className="btn-ghost press px-4 py-2 text-sm">לאישור העקרוני ←</Link>
        </div>
      </main>
      <AppFooter />
    </>
  );
}
