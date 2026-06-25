import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { requireRole } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { shekel } from "@/lib/format";
import { assignAdvisor } from "../actions";

export default async function LeadsPage() {
  await requireRole("admin");
  const db = supabase();
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
      <main className="mx-auto w-full max-w-[1140px] flex-1 px-5 py-10">
        <Link href="/admin" className="lbl hover:text-ember">→ חזרה לניהול</Link>
        <h1 className="display mt-2 mb-6 text-4xl font-black">לידים ושיוך</h1>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead><tr className="lbl border-b-2 border-ink text-right">
              <th className="py-2">לקוח</th><th>סטטוס</th><th>הלוואה</th><th>יועץ</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-rule">
                  <td className="py-3 font-bold">{r.client?.full_name ?? "—"}</td>
                  <td>{r.status}</td>
                  <td className="num">{r.request_details ? shekel(r.request_details.loan_amount) : "—"}</td>
                  <td>
                    <form action={assignAdvisor.bind(null, r.id)} className="flex items-center gap-2">
                      <select name="advisorId" defaultValue={r.advisor_id ?? ""} className="border border-rule bg-paper-2 px-2 py-1 outline-none focus:border-ink">
                        <option value="">— ללא —</option>
                        {(advisors ?? []).map((a) => (<option key={a.id} value={a.id}>{a.full_name}</option>))}
                      </select>
                      <button className="border border-ink px-3 py-1 text-xs font-bold hover:bg-ink hover:text-paper">שייך</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
