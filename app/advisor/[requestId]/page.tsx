import Link from "next/link";
import { notFound } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import DocStatusBadge from "@/components/DocStatusBadge";
import MessagesThread, { type ThreadMessage } from "@/components/MessagesThread";
import { requireRole } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase-server";
import { listSecurities, SECURITY_OPTIONS } from "@/lib/securities";
import {
  reviewDocument, updateClientDetails, addSecurity, removeSecurity,
  addBankOffer, markBestOffer, deleteBankOffer,
  saveActiveMortgage, addActiveTrack, removeActiveTrack,
} from "./actions";
import { markThreadRead } from "@/lib/messages";

const numField = "num w-full rounded-lg border border-rule-strong bg-paper px-2.5 py-1.5 text-sm outline-none focus:border-primary";

export default async function AdvisorClientPage({ params }: { params: Promise<{ requestId: string }> }) {
  const user = await requireRole("advisor");
  const { requestId } = await params;
  const db = await supabaseServer();

  const { data: req } = await db
    .from("requests").select("id, advisor_id, chosen_clock_id, client:profiles!requests_client_id_fkey(full_name, email)")
    .eq("id", requestId).maybeSingle();
  if (!req || req.advisor_id !== user.id) notFound();
  const client = (req as unknown as { client: { full_name: string; email: string } }).client;

  await markThreadRead(requestId);
  const [{ data: details }, { data: docs }, { data: msgs }, securities] = await Promise.all([
    db.from("request_details").select("property_value, equity, loan_amount").eq("request_id", requestId).maybeSingle(),
    db.from("documents").select("id, kind, file_name, status, storage_path").eq("request_id", requestId).order("kind"),
    db.from("messages").select("id, body, author_id, author:profiles!messages_author_id_fkey(full_name)").eq("request_id", requestId).order("created_at"),
    listSecurities(requestId),
  ]);
  const [{ data: offers }, { data: activeMortgage }, { data: activeTracks }] = await Promise.all([
    db.from("bank_offers").select("id, bank, note, rate_pct, approved, is_best").eq("request_id", requestId).order("created_at"),
    db.from("active_mortgages").select("payments_made, payments_total, started_at").eq("request_id", requestId).maybeSingle(),
    db.from("active_tracks").select("id, label, share_pct, balance, rate_label, monthly, years").eq("request_id", requestId).order("share_pct", { ascending: false }),
  ]);

  const thread: ThreadMessage[] = (msgs ?? []).map((m) => ({
    id: m.id, body: m.body,
    authorName: (m as unknown as { author: { full_name: string } | null }).author?.full_name ?? "יועץ",
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

        <h2 className="display mb-3 mt-8 text-xl font-bold">מכרז בנקים — אישור עקרוני</h2>
        <p className="mb-3 text-sm text-ink-2">ההצעות מוצגות ללקוח במסך ״מכרז בנקים״. סמנו ״הטובה ביותר״ להצעה הזוכה.</p>
        {(offers ?? []).length > 0 && (
          <ul className="card mb-3 divide-y divide-rule overflow-hidden rounded-2xl">
            {(offers ?? []).map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <p className="font-bold">
                    {o.bank}
                    {o.is_best && <span className="mr-2 rounded-full bg-primary px-2 py-0.5 text-[10.5px] font-extrabold text-white">★ הטובה ביותר</span>}
                    {!o.approved && <span className="mr-2 rounded-full bg-paper-2 px-2 py-0.5 text-[10.5px] font-bold text-ink-3">ממתין</span>}
                  </p>
                  {o.note && <p className="text-xs text-ink-3">{o.note}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="num font-bold">{o.rate_pct != null ? `${o.rate_pct.toFixed(2)}%` : "—"}</span>
                  {!o.is_best && (
                    <form action={markBestOffer.bind(null, o.id, requestId)}>
                      <button className="btn-ghost press px-3 py-1.5 text-xs">סמן כטובה ביותר</button>
                    </form>
                  )}
                  <form action={deleteBankOffer.bind(null, o.id, requestId)}>
                    <button className="text-sm font-semibold text-risk-high hover:underline">הסר</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
        <form action={addBankOffer.bind(null, requestId)} className="card grid grid-cols-2 items-end gap-2 rounded-2xl p-4 sm:grid-cols-12">
          <label className="block sm:col-span-3"><span className="lbl mb-1 block">בנק</span>
            <input name="bank" required className={numField} placeholder="בנק מזרחי-טפחות" /></label>
          <label className="block sm:col-span-2"><span className="lbl mb-1 block">ריבית משוקללת %</span>
            <input name="rate_pct" type="number" step="0.01" className={numField} placeholder="4.21" /></label>
          <label className="block sm:col-span-4"><span className="lbl mb-1 block">הערה</span>
            <input name="note" className={numField} placeholder="אישור עקרוני התקבל" /></label>
          <label className="flex items-center gap-1.5 pb-2 text-xs font-semibold sm:col-span-2">
            <input type="checkbox" name="approved" className="accent-[var(--primary)]" /> אושר עקרונית
          </label>
          <button className="btn-primary press px-4 py-1.5 text-sm sm:col-span-1">הוסף</button>
        </form>

        <h2 className="display mb-3 mt-8 text-xl font-bold">משכנתא פעילה (לאחר חתימה)</h2>
        <p className="mb-3 text-sm text-ink-2">הזנת נתוני הביצוע פותחת ללקוח את מסך ״ניהול משכנתא פעילה״ ומסמנת את התהליך כהושלם.</p>
        <form action={saveActiveMortgage.bind(null, requestId)} className="card grid grid-cols-2 items-end gap-2 rounded-2xl p-4 sm:grid-cols-12">
          <label className="block sm:col-span-3"><span className="lbl mb-1 block">תשלומים ששולמו</span>
            <input name="payments_made" type="number" defaultValue={activeMortgage?.payments_made ?? 0} className={numField} /></label>
          <label className="block sm:col-span-3"><span className="lbl mb-1 block">סה״כ תשלומים</span>
            <input name="payments_total" type="number" defaultValue={activeMortgage?.payments_total ?? 0} className={numField} /></label>
          <label className="block sm:col-span-4"><span className="lbl mb-1 block">תאריך תחילה</span>
            <input name="started_at" type="date" dir="ltr" defaultValue={activeMortgage?.started_at ?? ""} className={numField} /></label>
          <button className="btn-primary press px-4 py-1.5 text-sm sm:col-span-2">{activeMortgage ? "עדכן" : "פתח ניהול"}</button>
        </form>
        {activeMortgage && (
          <>
            {(activeTracks ?? []).length > 0 && (
              <ul className="card mb-2 mt-3 divide-y divide-rule overflow-hidden rounded-2xl">
                {(activeTracks ?? []).map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 p-3.5 text-sm">
                    <span className="font-bold">{t.label} · {t.share_pct}%</span>
                    <span className="num text-ink-2">יתרה {t.balance.toLocaleString("he-IL")} ₪ · {t.rate_label} · {t.monthly.toLocaleString("he-IL")} ₪/ח׳ · {t.years} שנים</span>
                    <form action={removeActiveTrack.bind(null, t.id, requestId)}>
                      <button className="text-sm font-semibold text-risk-high hover:underline">הסר</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form action={addActiveTrack.bind(null, requestId)} className="card mt-2 grid grid-cols-2 items-end gap-2 rounded-2xl p-4 sm:grid-cols-12">
              <label className="block sm:col-span-3"><span className="lbl mb-1 block">מסלול</span>
                <input name="label" required className={numField} placeholder="קבועה לא צמודה" /></label>
              <label className="block sm:col-span-1"><span className="lbl mb-1 block">%</span>
                <input name="share_pct" type="number" className={numField} /></label>
              <label className="block sm:col-span-2"><span className="lbl mb-1 block">יתרה</span>
                <input name="balance" type="number" className={numField} /></label>
              <label className="block sm:col-span-2"><span className="lbl mb-1 block">ריבית</span>
                <input name="rate_label" className={numField} placeholder="4.30% / P-0.7%" /></label>
              <label className="block sm:col-span-2"><span className="lbl mb-1 block">החזר חודשי</span>
                <input name="monthly" type="number" className={numField} /></label>
              <label className="block sm:col-span-1"><span className="lbl mb-1 block">שנים</span>
                <input name="years" type="number" className={numField} /></label>
              <button className="btn-primary press px-3 py-1.5 text-sm sm:col-span-1">הוסף</button>
            </form>
          </>
        )}

        <h2 className="display mb-3 mt-8 text-xl font-bold">הודעות</h2>
        <div className="card rounded-2xl p-6">
          <MessagesThread requestId={requestId} messages={thread} />
        </div>
      </main>
      <AppFooter />
    </>
  );
}
