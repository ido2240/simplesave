import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import MessagesThread, { type ThreadMessage } from "@/components/MessagesThread";
import { requireRole } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase-server";
import { getActiveRequest } from "@/lib/requests";
import { requirePaid } from "@/lib/billing";
import { markThreadRead } from "@/lib/messages";

// Client-side advisor chat (mockup: הודעות ליועץ panel).
export default async function ClientMessagesPage() {
  const user = await requireRole("client");
  const req = await getActiveRequest(user.id);
  if (!req) {
    return (<><AppHeader /><main className="mx-auto max-w-xl flex-1 px-5 py-20 text-center"><Link href="/new-mortgage" className="btn-primary px-6 py-3">התחל שאלון</Link></main><AppFooter /></>);
  }
  await requirePaid(req.id);
  await markThreadRead(req.id);

  const db = await supabaseServer();
  const [{ data: msgs }, advisorName] = await Promise.all([
    db.from("messages")
      .select("id, body, author_id, author:profiles!messages_author_id_fkey(full_name)")
      .eq("request_id", req.id).order("created_at"),
    req.advisor_id
      ? db.from("profiles").select("full_name").eq("id", req.advisor_id).maybeSingle().then((r) => r.data?.full_name ?? null)
      : Promise.resolve(null),
  ]);

  const thread: ThreadMessage[] = (msgs ?? []).map((m) => ({
    id: m.id,
    body: m.body,
    authorName: (m as unknown as { author: { full_name: string } }).author.full_name,
    mine: m.author_id === user.id,
  }));

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12 sm:px-7">
        <p className="text-sm font-bold text-primary">ליווי אישי</p>
        <h1 className="display mb-2 mt-2 text-4xl font-bold">הודעות ליועץ</h1>
        <p className="mb-6 text-ink-2">
          {advisorName
            ? <>היועץ שלכם: <b>{advisorName}</b>. הודעות נענות בשעות הפעילות.</>
            : "יועץ יוקצה לבקשה שלכם בקרוב — אפשר כבר לכתוב, ההודעות יחכו לו כאן."}
        </p>
        <div className="card rounded-2xl p-6">
          <MessagesThread requestId={req.id} messages={thread} />
        </div>
      </main>
      <AppFooter />
    </>
  );
}
