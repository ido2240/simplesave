import Link from "next/link";
import { notFound } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import DocStatusBadge from "@/components/DocStatusBadge";
import MessagesThread, { type ThreadMessage } from "@/components/MessagesThread";
import { requireRole } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { listSecurities, SECURITY_OPTIONS } from "@/lib/securities";
import { reviewDocument, updateClientDetails, addSecurity, removeSecurity } from "./actions";

const numField = "num w-full rounded-lg border border-rule-strong bg-paper px-2.5 py-1.5 text-sm outline-none focus:border-primary";

export default async function AdvisorClientPage({ params }: { params: Promise<{ requestId: string }> }) {
  const user = await requireRole("advisor");
  const { requestId } = await params;
  const db = supabase();

  const { data: req } = await db
    .from("requests").select("id, advisor_id, chosen_clock_id, client:profiles!requests_client_id_fkey(full_name, email)")
    .eq("id", requestId).maybeSingle();
  if (!req || req.advisor_id !== user.id) notFound();
  const client = (req as unknown as { client: { full_name: string; email: string } }).client;

  const [{ data: details }, { data: docs }, { data: msgs }, securities] = await Promise.all([
    db.from("request_details").select("property_value, equity, loan_amount").eq("request_id", requestId).maybeSingle(),
    db.from("documents").select("id, kind, file_name, status, storage_path").eq("request_id", requestId).order("kind"),
    db.from("messages").select("id, body, author_id, author:profiles!messages_author_id_fkey(full_name)").eq("request_id", requestId).order("created_at"),
    listSecurities(requestId),
  ]);

  const thread: ThreadMessage[] = (msgs ?? []).map((m) => ({
    id: m.id, body: m.body,
    authorName: (m as unknown as { author: { full_name: string } }).author.full_name,
    mine: m.author_id === user.id,
  }));

  // Short-lived signed URLs so the advisor can open uploaded files.
  const fileUrls: Record<string, string> = {};
  await Promise.all(
    (docs ?? [])
      .filter((d) => d.storage_path)
      .map(async (d) => {
        const { data: signed } = await db.storage.from("documents").createSignedUrl(d.storage_path as string, 3600);
        if (signed?.signedUrl) fileUrls[d.id] = signed.signedUrl;
      }),
  );

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 sm:px-7">
        <Link href="/advisor" className="lbl hover:text-primary">→ חזרה ללקוחות</Link>
        <h1 className="display mt-2 text-4xl font-bold">{client.full_name}</h1>
        <p className="num text-sm text-ink-2">{client.email}</p>

        {details && (
          <form action={updateClientDetails.bind(null, requestId)} className="card mt-5 rounded-2xl p-6">
            <p className="lbl mb-3">נתוני הלקוח (ניתן לעדכן)</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <label className="block"><span className="lbl mb-1 block">שווי נכס</span>
                <input name="property_value" type="number" defaultValue={details.property_value} className={numField} /></label>
              <label className="block"><span className="lbl mb-1 block">הון עצמי</span>
                <input name="equity" type="number" defaultValue={details.equity} className={numField} /></label>
              <label className="block"><span className="lbl mb-1 block">הלוואה</span>
                <input name="loan_amount" type="number" defaultValue={details.loan_amount} className={numField} /></label>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button className="btn-primary press px-5 py-1.5 text-sm">שמור שינויים</button>
              <span className="text-xs text-ink-3">תמהיל נבחר: {req.chosen_clock_id ?? "—"}</span>
            </div>
          </form>
        )}

        <h2 className="display mb-3 mt-8 text-xl font-bold">מסמכים</h2>
        <ul className="card divide-y divide-rule overflow-hidden rounded-2xl">
          {(docs ?? []).map((doc) => (
            <li key={doc.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold">{doc.kind}</p>
                  {doc.file_name && <p className="num text-xs text-ink-3">{doc.file_name}</p>}
                  {fileUrls[doc.id] && (
                    <a href={fileUrls[doc.id]} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary hover:underline">
                      צפייה בקובץ ↗
                    </a>
                  )}
                </div>
                <DocStatusBadge status={doc.status} />
              </div>
              {doc.status === "ממתין לבדיקה" && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <form action={reviewDocument.bind(null, doc.id, "תקין")}>
                    <button className="press rounded-lg border border-refi px-3 py-1.5 text-sm font-bold text-refi hover:bg-refi hover:text-white">אשר</button>
                  </form>
                  <form action={reviewDocument.bind(null, doc.id, "דרוש תיקון")} className="flex flex-1 gap-2">
                    <input name="note" placeholder="סיבת דחייה…" className="flex-1 rounded-lg border border-rule-strong bg-paper px-2.5 py-1.5 text-sm outline-none focus:border-primary" />
                    <button className="press rounded-lg border border-risk-high px-3 py-1.5 text-sm font-bold text-risk-high hover:bg-risk-high hover:text-white">דרוש תיקון</button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>

        <h2 className="display mb-3 mt-8 text-xl font-bold">בטחונות</h2>
        <p className="mb-3 text-sm text-ink-2">רשימת הבטחונות מוזנת ידנית לאחר חתימת המשכנתא. בחרו מהרשימה או הוסיפו דרישה.</p>
        {securities.length > 0 ? (
          <ul className="card mb-3 divide-y divide-rule overflow-hidden rounded-2xl">
            {securities.map((s) => (
              <li key={s.id} className="flex items-center justify-between p-4">
                <div><p className="font-bold">{s.description}</p><p className="lbl">{s.kind}</p></div>
                <form action={removeSecurity.bind(null, s.id, requestId)}>
                  <button className="text-sm font-semibold text-risk-high hover:underline">הסר</button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-3 text-sm text-ink-3">טרם הוזנו בטחונות.</p>
        )}
        <form action={addSecurity.bind(null, requestId)} className="grid grid-cols-1 gap-2 sm:grid-cols-12">
          <select name="preset" className={`${numField} sm:col-span-4`} defaultValue="">
            <option value="">— בחר בטוחה —</option>
            {SECURITY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <input name="custom" placeholder="או דרישה ידנית…" className={`${numField} sm:col-span-6`} />
          <button className="btn-primary press px-4 py-1.5 text-sm sm:col-span-2">הוסף</button>
        </form>

        <h2 className="display mb-3 mt-8 text-xl font-bold">הודעות</h2>
        <div className="card rounded-2xl p-6">
          <MessagesThread requestId={requestId} messages={thread} />
        </div>
      </main>
      <AppFooter />
    </>
  );
}
