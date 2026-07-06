import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { requireRole } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase-server";

// Manager advisor-load view (mockup 11a): per advisor — clients, in-process,
// closed (executed mortgages), and a load bar.
const LOAD_FULL_AT = 15; // clients considered a full plate

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

export default async function AdvisorLoadPage() {
  await requireRole("admin");
  const db = await supabaseServer();
  const [{ data: advisors }, { data: requests }, { data: actives }] = await Promise.all([
    db.from("profiles").select("id, full_name").eq("role", "advisor").order("full_name"),
    db.from("requests").select("id, advisor_id, status"),
    db.from("active_mortgages").select("request_id"),
  ]);
  const activeSet = new Set((actives ?? []).map((a) => a.request_id));

  const rows = (advisors ?? []).map((a) => {
    const mine = (requests ?? []).filter((r) => r.advisor_id === a.id);
    const closed = mine.filter((r) => activeSet.has(r.id)).length;
    const inProcess = mine.filter((r) => r.status === "active" && !activeSet.has(r.id)).length
      + mine.filter((r) => r.status !== "active").length;
    const load = Math.min(100, Math.round((mine.length / LOAD_FULL_AT) * 100));
    return { ...a, clients: mine.length, inProcess, closed, load };
  });

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 sm:px-7">
        <Link href="/admin" className="lbl hover:text-manager">→ חזרה לניהול</Link>
        <h1 className="display mb-2 mt-2 text-4xl font-bold">עומס יועצים</h1>
        <p className="mb-6 text-ink-2">חלוקת הלקוחות בין היועצים — לשיוך לידים חדשים לפי עומס.</p>

        {rows.length === 0 ? (
          <p className="text-ink-2">אין יועצים במערכת.</p>
        ) : (
          <div className="space-y-4">
            {rows.map((a) => (
              <div key={a.id} className="card rounded-2xl p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-[46px] w-[46px] items-center justify-center rounded-[13px] bg-gradient-to-br from-[#7a4fe0] to-[#5733b0] text-base font-extrabold text-white">
                    {initials(a.full_name)}
                  </span>
                  <p className="flex-1 font-bold">{a.full_name}</p>
                  <span className="num text-sm font-bold" style={{ color: a.load > 80 ? "#E04848" : a.load > 60 ? "#E0A100" : "#15976A" }}>
                    עומס {a.load}%
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-rule">
                  <div className="h-2 rounded-full" style={{ width: `${a.load}%`, background: a.load > 80 ? "#E04848" : a.load > 60 ? "#E0A100" : "#15976A" }} />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div><p className="lbl">לקוחות</p><p className="display num text-xl font-bold">{a.clients}</p></div>
                  <div><p className="lbl">בתהליך</p><p className="display num text-xl font-bold">{a.inProcess}</p></div>
                  <div><p className="lbl">תיקים סגורים</p><p className="display num text-xl font-bold">{a.closed}</p></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <AppFooter />
    </>
  );
}
