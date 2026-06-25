import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { requireRole } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { shekel } from "@/lib/format";

export default async function AdvisorPage() {
  const user = await requireRole("advisor");
  const db = supabase();
  const { data: requests } = await db
    .from("requests")
    .select("id, status, client:profiles!requests_client_id_fkey(full_name), request_details(loan_amount), documents(status)")
    .eq("advisor_id", user.id)
    .order("created_at", { ascending: false });

  const rows = (requests ?? []) as unknown as {
    id: string; status: string;
    client: { full_name: string } | null;
    request_details: { loan_amount: number } | null;
    documents: { status: string }[];
  }[];

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-[1140px] flex-1 px-5 py-10">
        <p className="lbl mb-1">יועץ</p>
        <h1 className="display mb-6 text-4xl font-black">הלקוחות שלי</h1>
        {rows.length === 0 ? (
          <p className="text-ink-2">אין לקוחות משויכים עדיין.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead><tr className="lbl border-b-2 border-ink text-right">
                <th className="py-2">לקוח</th><th>סטטוס</th><th>הלוואה</th><th>לבדיקה</th><th></th>
              </tr></thead>
              <tbody>
                {rows.map((r) => {
                  const pending = r.documents.filter((d) => d.status === "ממתין לבדיקה").length;
                  return (
                    <tr key={r.id} className="border-b border-rule">
                      <td className="py-3 font-bold">{r.client?.full_name ?? "—"}</td>
                      <td>{r.status}</td>
                      <td className="num">{r.request_details ? shekel(r.request_details.loan_amount) : "—"}</td>
                      <td className="num">{pending > 0 ? <span className="font-bold text-ochre">{pending}</span> : "0"}</td>
                      <td className="text-left"><Link href={`/advisor/${r.id}`} className="underline hover:text-ember">פתח</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
