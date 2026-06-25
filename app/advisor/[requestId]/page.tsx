import Link from "next/link";
import { notFound } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import DocStatusBadge from "@/components/DocStatusBadge";
import MessagesThread, { type ThreadMessage } from "@/components/MessagesThread";
import { requireRole } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { shekel } from "@/lib/format";
import { reviewDocument } from "./actions";

export default async function AdvisorClientPage({ params }: { params: Promise<{ requestId: string }> }) {
  const user = await requireRole("advisor");
  const { requestId } = await params;
  const db = supabase();

  const { data: req } = await db
    .from("requests").select("id, advisor_id, chosen_clock_id, client:profiles!requests_client_id_fkey(full_name, email)")
    .eq("id", requestId).maybeSingle();
  if (!req || req.advisor_id !== user.id) notFound();
  const client = (req as unknown as { client: { full_name: string; email: string } }).client;

  const [{ data: details }, { data: docs }, { data: msgs }] = await Promise.all([
    db.from("request_details").select("property_value, equity, loan_amount").eq("request_id", requestId).maybeSingle(),
    db.from("documents").select("id, kind, file_name, status").eq("request_id", requestId).order("kind"),
    db.from("messages").select("id, body, author_id, author:profiles!messages_author_id_fkey(full_name)").eq("request_id", requestId).order("created_at"),
  ]);

  const thread: ThreadMessage[] = (msgs ?? []).map((m) => ({
    id: m.id, body: m.body,
    authorName: (m as unknown as { author: { full_name: string } }).author.full_name,
    mine: m.author_id === user.id,
  }));

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <Link href="/advisor" className="lbl hover:text-ember">→ חזרה ללקוחות</Link>
        <h1 className="display mt-2 text-4xl font-black">{client.full_name}</h1>
        <p className="num text-sm text-ink-2">{client.email}</p>

        {details && (
          <div className="mt-5 grid grid-cols-2 gap-4 border-y border-rule py-4 sm:grid-cols-4">
            <Stat label="שווי נכס" value={shekel(details.property_value)} />
            <Stat label="הון עצמי" value={shekel(details.equity)} />
            <Stat label="הלוואה" value={shekel(details.loan_amount)} />
            <Stat label="תמהיל נבחר" value={req.chosen_clock_id ?? "—"} />
          </div>
        )}

        <h2 className="display mt-8 mb-3 text-xl font-bold">מסמכים</h2>
        <ul className="divide-y divide-rule border-y border-rule">
          {(docs ?? []).map((doc) => (
            <li key={doc.id} className="py-3">
              <div className="flex items-center justify-between">
                <div><p className="font-bold">{doc.kind}</p>{doc.file_name && <p className="num text-xs text-ink-3">{doc.file_name}</p>}</div>
                <DocStatusBadge status={doc.status} />
              </div>
              {doc.status === "ממתין לבדיקה" && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <form action={reviewDocument.bind(null, doc.id, "תקין")}>
                    <button className="border border-forest px-3 py-1 text-sm font-bold text-forest hover:bg-forest hover:text-paper">אשר</button>
                  </form>
                  <form action={reviewDocument.bind(null, doc.id, "דרוש תיקון")} className="flex flex-1 gap-2">
                    <input name="note" placeholder="סיבת דחייה…" className="flex-1 border border-rule bg-paper-2 px-2 py-1 text-sm outline-none focus:border-ink" />
                    <button className="border border-brick px-3 py-1 text-sm font-bold text-brick hover:bg-brick hover:text-paper">דרוש תיקון</button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>

        <h2 className="display mt-8 mb-3 text-xl font-bold">הודעות</h2>
        <MessagesThread requestId={requestId} messages={thread} />
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div><p className="lbl">{label}</p><p className="num font-bold">{value}</p></div>;
}
