import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { requireRole } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase-server";
import { shekel } from "@/lib/format";
import { assignAdvisor } from "../actions";

export default async function LeadsPage() {
  await requireRole("admin");
  const db = await supabaseServer();
  const [{ data: requests }, { data: advisors }] = await Promise.all([
    db.from("requests").select("id, status, advisor_id, client:profiles!requests_client_id_fkey(full_name), request_details(loan_amount)").order("created_at", { ascending: false }),
    db.from("profiles").select("id, full_name").eq("role", "advisor"),
  ]);

  const rows = (requests ?? []) as unknown as {
    id: string; status: string; advisor_id: string | null;
    client: { full_name: string } | null; request_details: { loan_amount: number } | null;
  }[];

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-[1140px] flex-1 px-5 py-8 sm:px-7">
        <Link href="/admin" className="lbl hover:text-manager">→ חזרה לניהול</Link>
        <h1 className="display mb-6 mt-2 text-4xl font-bold">לידים ושיוך</h1>
        <div className="card overflow-x-auto rounded-2xl p-2">
          <table className="w-full min-w-[520px] text-sm">
            <thead><tr className="lbl border-b border-rule text-right">
              <th className="px-4 py-3">לקוח</th><th>סטטוס</th><th>הלוואה</th><th>יועץ</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-rule last:border-0">
                  <td className="px-4 py-3.5 font-bold">{r.client?.full_name ?? "—"}</td>
                  <td><span className="pill bg-paper-2 text-ink-2">{r.status}</span></td>
                  <td className="num">{r.request_details ? shekel(r.request_details.loan_amount) : "—"}</td>
                  <td>
                    <form action={assignAdvisor.bind(null, r.id)} className="flex items-center gap-2">
                      <select name="advisorId" defaultValue={r.advisor_id ?? ""} className="rounded-lg border border-rule-strong bg-paper px-2.5 py-1.5 outline-none focus:border-manager">
                        <option value="">— ללא —</option>
                        {(advisors ?? []).map((a) => (<option key={a.id} value={a.id}>{a.full_name}</option>))}
                      </select>
                      <button className="press rounded-lg bg-manager px-4 py-1.5 text-xs font-bold text-white hover:opacity-90">שייך</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <AppFooter />
    </>
  );
}
