import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { requireRole } from "@/lib/session";
import { loadClockTemplates } from "@/lib/engine-config";

const TRACK_LABEL: Record<string, string> = { fixed: "קבועה", variable: "משתנה", prime: "פריים" };
const CLOCK_LABEL: Record<string, string> = { clock1: "שעון 1", clock2: "שעון 2", clock3: "שעון 3", clock4: "שעון 4", clock5: "שעון 5" };

export default async function TemplatesPage() {
  await requireRole("admin");
  const templates = await loadClockTemplates();

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <Link href="/admin" className="lbl hover:text-ember">→ חזרה לניהול</Link>
        <h1 className="display mt-2 mb-2 text-4xl font-black">תבניות שעונים</h1>
        <p className="mb-6 text-ink-2">תבניות הרפרנס המאומתות. כפילויות מסומנות — מומלץ להחליפן לאחר אישור הלקוח.</p>
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="border border-rule p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="display text-lg font-bold">{t.name}</span>
                {t.recommended && <span className="bg-ember px-1.5 py-0.5 text-[10px] font-bold text-paper">מומלץ</span>}
                {t.duplicate_of && (
                  <span className="border border-brick px-1.5 py-0.5 text-[10px] font-bold text-brick">
                    כפיל של {CLOCK_LABEL[t.duplicate_of] ?? t.duplicate_of}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {t.routes.map((rt, i) => (
                  <span key={i} className="border border-rule px-2 py-0.5 text-xs">
                    {TRACK_LABEL[rt.kind]} {rt.sharePct}%{rt.indexType === "מדד" ? " צמודה" : ""}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
