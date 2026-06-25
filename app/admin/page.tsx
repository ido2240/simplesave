import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { requireRole } from "@/lib/session";
import { supabase } from "@/lib/supabase";

async function count(table: string, filter?: [string, string]): Promise<number> {
  let q = supabase().from(table).select("*", { count: "exact", head: true });
  if (filter) q = q.eq(filter[0], filter[1]);
  const { count } = await q;
  return count ?? 0;
}

export default async function AdminPage() {
  await requireRole("admin");
  const [clients, advisors, requests, paid] = await Promise.all([
    count("profiles", ["role", "client"]),
    count("profiles", ["role", "advisor"]),
    count("requests"),
    count("requests", ["service_status", "PAID"]),
  ]);

  const cards = [
    { href: "/admin/params", title: "פרמטרים כלכליים", desc: "מדד, מט\"ח, ריבית פריים — משנה את השעונים" },
    { href: "/admin/templates", title: "תבניות שעונים", desc: "5 התמהילים + סימון כפילויות" },
    { href: "/admin/leads", title: "לידים ושיוך", desc: "שיוך לקוחות ליועצים" },
  ];

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-[1140px] flex-1 px-5 py-10">
        <p className="lbl mb-1">ניהול</p>
        <h1 className="display mb-6 text-4xl font-black">לוח בקרה</h1>
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KPI label="לקוחות" value={clients} />
          <KPI label="יועצים" value={advisors} />
          <KPI label="בקשות" value={requests} />
          <KPI label="שילמו" value={paid} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {cards.map((c) => (
            <Link key={c.href} href={c.href} className="border border-rule p-5 hover:bg-paper-2">
              <p className="display text-xl font-bold">{c.title}</p>
              <p className="mt-1 text-sm text-ink-3">{c.desc}</p>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}

function KPI({ label, value }: { label: string; value: number }) {
  return (<div className="border border-rule p-4"><p className="lbl">{label}</p><p className="num text-3xl font-black">{value}</p></div>);
}
