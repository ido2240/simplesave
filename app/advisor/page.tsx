import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import DashHeader, { DashStat } from "@/components/DashHeader";
import { requireRole } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase-server";
import { shekel } from "@/lib/format";
import PendingButton from "@/components/PendingButton";
import { addTask, toggleTask, deleteTask } from "./actions";

const SERVICE_LABEL: Record<string, string> = {
  new_mortgage: "משכנתא חדשה", refinance: "מחזור משכנתא", insurance: "ביטוח משכנתא",
};
const STEP_LABEL: Record<string, string> = {
  lead: "ליד חדש", clocks: "בחירת תמהיל", registered: "הרשמה והמשך", active: "בטיפול",
};
const STAGE_STYLE: Record<string, string> = {
  lead: "bg-paper-2 text-ink-3",
  clocks: "bg-primary/10 text-primary",
  registered: "bg-[#7a4fe0]/12 text-manager",
  active: "bg-risk-low/12 text-risk-low",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

export default async function AdvisorPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireRole("advisor");
  const tab = (await searchParams).tab === "tasks" ? "tasks" : "clients";
  const db = await supabaseServer();

  const [{ data }, { data: unreadRows }, { data: myTasks }] = await Promise.all([
    db.from("requests")
      .select("id, status, service, client:profiles!requests_client_id_fkey(full_name), request_details(loan_amount), documents(id, kind, status)")
      .eq("advisor_id", user.id)
      .order("created_at", { ascending: false }),
    db.from("messages").select("id, request_id").neq("author_id", user.id).is("read_at", null),
    db.from("advisor_tasks").select("id, txt, due, urgent, done").eq("advisor_id", user.id).order("done").order("created_at"),
  ]);
  const unreadByReq = new Map<string, number>();
  for (const m of unreadRows ?? []) unreadByReq.set(m.request_id, (unreadByReq.get(m.request_id) ?? 0) + 1);

  const rows = (data ?? []) as unknown as {
    id: string; status: string; service: string;
    client: { full_name: string } | null;
    request_details: { loan_amount: number } | null;
    documents: { id: string; kind: string; status: string }[];
  }[];

  const cards = rows.map((r) => {
    const name = r.client?.full_name ?? "—";
    const pending = r.documents.filter((d) => d.status === "ממתין לבדיקה").length;
    const next = pending > 0 ? `בדיקת ${pending} מסמכים` : r.status === "active" ? "מעקב שוטף" : "—";
    return {
      id: r.id, name,
      service: SERVICE_LABEL[r.service] ?? r.service,
      amount: r.request_details ? shekel(r.request_details.loan_amount) : "—",
      step: STEP_LABEL[r.status] ?? r.status,
      stageClass: STAGE_STYLE[r.status] ?? "bg-paper-2 text-ink-3",
      next, pending,
      unread: unreadByReq.get(r.id) ?? 0,
    };
  });

  const tasks = rows.flatMap((r) =>
    r.documents
      .filter((d) => d.status === "ממתין לבדיקה")
      .map((d) => ({ reqId: r.id, client: r.client?.full_name ?? "—", kind: d.kind })),
  );
  const taskList = myTasks ?? [];
  const openTaskCount = tasks.length + taskList.filter((t) => !t.done).length;
  const totalUnread = [...unreadByReq.values()].reduce((s, n) => s + n, 0);

  const segActive = "rounded-xl bg-white px-5 py-2 text-sm font-bold text-ink shadow-sm";
  const segIdle = "rounded-xl px-5 py-2 text-sm font-semibold text-ink-3 hover:text-ink";

  return (
    <>
      <AppHeader />
      <DashHeader eyebrow="אזור היועץ" title={`שלום, ${user.name} 👋`} variant="advisor">
        <DashStat label="לקוחות פעילים" value={rows.length} />
        <DashStat label="משימות פתוחות" value={openTaskCount} accent="#FFD98A" />
        <DashStat label="הודעות שלא נקראו" value={totalUnread} accent="#7DE6B4" />
      </DashHeader>

      <main className="mx-auto w-full max-w-[1140px] flex-1 px-5 py-8 sm:px-7">
        <div className="mb-6 inline-flex gap-1.5 rounded-2xl bg-paper-2 p-1.5">
          <Link href="/advisor" className={tab === "clients" ? segActive : segIdle}>הלקוחות שלי</Link>
          <Link href="/advisor?tab=tasks" className={tab === "tasks" ? segActive : segIdle}>
            משימות ומעקבים{openTaskCount ? ` · ${openTaskCount}` : ""}
          </Link>
        </div>

        {tab === "clients" ? (
          rows.length === 0 ? (
            <p className="text-ink-2">אין לקוחות משויכים עדיין.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((c) => (
                <div key={c.id} className="card lift rounded-2xl p-5">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                      style={{ background: "linear-gradient(135deg,#2f57e0,#1f379c)" }}
                    >
                      {initials(c.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-bold">{c.name}</p>
                      <p className="num text-xs text-ink-3">{c.service} · {c.amount}</p>
                    </div>
                    <span className="ms-auto flex shrink-0 items-center gap-1.5">
                      {c.unread > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e04848] px-1.5 text-[11px] font-extrabold text-white" title={`${c.unread} הודעות שלא נקראו`}>
                          {c.unread}
                        </span>
                      )}
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${c.stageClass}`}>{c.step}</span>
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div><p className="lbl">שלב נוכחי</p><p className="text-sm font-semibold">{c.step}</p></div>
                    <div><p className="lbl">טיפול קרוב</p><p className={`text-sm font-semibold ${c.pending ? "text-risk-mid" : "text-ink-2"}`}>{c.next}</p></div>
                  </div>
                  <Link href={`/advisor/${c.id}`} className="btn-ghost press mt-4 block w-full py-2 text-center text-sm">פתח תיק ←</Link>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="lbl mb-2">בדיקות מסמכים</h2>
              {tasks.length === 0 ? (
                <p className="text-sm text-ink-3">אין מסמכים שממתינים לבדיקה. 🎉</p>
              ) : (
                <ul className="card divide-y divide-rule overflow-hidden rounded-2xl">
                  {tasks.map((t, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 p-4">
                      <div>
                        <p className="font-bold">{t.client}</p>
                        <p className="text-sm text-ink-3">ממתין לבדיקה: {t.kind}</p>
                      </div>
                      <Link href={`/advisor/${t.reqId}`} className="btn-ghost press px-4 py-1.5 text-sm">בדיקה ←</Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h2 className="lbl mb-2">המשימות שלי</h2>
              {taskList.length > 0 && (
                <ul className="card mb-3 divide-y divide-rule overflow-hidden rounded-2xl">
                  {taskList.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-3 p-4">
                      <div className="flex items-center gap-3">
                        <form action={toggleTask.bind(null, t.id, !t.done)}>
                          <button
                            aria-label={t.done ? "סמן כלא בוצע" : "סמן כבוצע"}
                            className={`flex h-[22px] w-[22px] items-center justify-center rounded-[7px] text-xs font-bold ${t.done ? "bg-[#15976A] text-white" : "border-2 border-rule-strong"}`}
                          >
                            {t.done ? "✓" : ""}
                          </button>
                        </form>
                        <p className={`text-[14.5px] font-semibold ${t.done ? "text-ink-3 line-through" : ""}`}>{t.txt}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {t.due && (
                          <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${t.urgent && !t.done ? "bg-[#fceeec] text-risk-high" : "bg-paper-2 text-ink-3"}`}>
                            {t.due}
                          </span>
                        )}
                        <form action={deleteTask.bind(null, t.id)}>
                          <button className="text-sm font-semibold text-risk-high hover:underline">מחק</button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <form action={addTask} className="card grid grid-cols-2 items-end gap-2 rounded-2xl p-4 sm:grid-cols-12">
                <label className="block sm:col-span-6"><span className="lbl mb-1 block">משימה חדשה</span>
                  <input name="txt" required placeholder="לבדוק תלושי שכר — …" className="w-full rounded-lg border border-rule-strong bg-paper px-2.5 py-1.5 text-sm outline-none focus:border-primary" /></label>
                <label className="block sm:col-span-2"><span className="lbl mb-1 block">מועד</span>
                  <input name="due" placeholder="היום / מחר" className="w-full rounded-lg border border-rule-strong bg-paper px-2.5 py-1.5 text-sm outline-none focus:border-primary" /></label>
                <label className="flex items-center gap-1.5 pb-2 text-xs font-semibold sm:col-span-2">
                  <input type="checkbox" name="urgent" className="accent-[#e04848]" /> דחוף
                </label>
                <PendingButton className="btn-primary press px-4 py-1.5 text-sm sm:col-span-2" pendingLabel="מוסיף…">הוסף משימה</PendingButton>
              </form>
            </div>
          </div>
        )}
      </main>
      <AppFooter />
    </>
  );
}
