import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import DashHeader, { DashStat } from "@/components/DashHeader";
import { requireRole } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase-server";

async function count(table: string, filter?: [string, string]): Promise<number> {
  let q = (await supabaseServer()).from(table).select("*", { count: "exact", head: true });
  if (filter) q = q.eq(filter[0], filter[1]);
  const { count } = await q;
  return count ?? 0;
}

export default async function AdminPage() {
  await requireRole("admin");
  const [clients, advisors, requests, paid, leads] = await Promise.all([
    count("profiles", ["role", "client"]),
    count("profiles", ["role", "advisor"]),
    count("requests"),
    count("requests", ["service_status", "PAID"]),
    count("requests", ["status", "lead"]),
  ]);

  const cards = [
    { href: "/admin/params", title: "פרמטרים כלכליים", desc: "מדד, מט\"ח, ריבית פריים — משנה את השעונים" },
    { href: "/admin/templates", title: "תבניות שעונים", desc: "5 התמהילים + סימון כפילויות" },
    { href: "/admin/leads", title: "לידים ושיוך", desc: "שיוך לקוחות ליועצים" },
  ];

  return (
    <>
      <AppHeader />
      <DashHeader eyebrow="אזור הניהול" title="לוח בקרה — מנהל מערכת" variant="manager">
        <DashStat label="לידים חדשים" value={leads} />
        <DashStat label="יועצים פעילים" value={advisors} accent="#FFD98A" />
      </DashHeader>
      <main className="mx-auto w-full max-w-[1140px] flex-1 px-5 py-8 sm:px-7">
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <KPI label="לידים חדשים" value={leads} />
          <KPI label="לקוחות" value={clients} />
          <KPI label="יועצים" value={advisors} />
          <KPI label="בקשות" value={requests} />
          <KPI label="שילמו" value={paid} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {cards.map((c) => (
            <Link key={c.href} href={c.href} className="card lift press rounded-2xl p-6">
              <p className="display text-xl font-bold">{c.title}</p>
              <p className="mt-1 text-sm text-ink-3">{c.desc}</p>
            </Link>
          ))}
        </div>
      </main>
      <AppFooter />
    </>
  );
}

function KPI({ label, value }: { label: string; value: number }) {
  return (
    <div className="card rounded-2xl p-5">
      <p className="lbl">{label}</p>
      <p className="display num mt-1 text-3xl font-bold text-manager">{value}</p>
    </div>
  );
}
