import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { requireRole } from "@/lib/session";
import { loadClockTemplates } from "@/lib/engine-config";
import { updateTemplate } from "./actions";

const TRACK_LABEL: Record<string, string> = { fixed: "קבועה", variable: "משתנה", prime: "פריים" };
const CLOCK_LABEL: Record<string, string> = { clock1: "שעון 1", clock2: "שעון 2", clock3: "שעון 3", clock4: "שעון 4", clock5: "שעון 5" };

export default async function TemplatesPage() {
  await requireRole("admin");
  const templates = await loadClockTemplates();

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 sm:px-7">
        <Link href="/admin" className="lbl hover:text-manager">→ חזרה לניהול</Link>
        <h1 className="display mb-2 mt-2 text-4xl font-bold">תבניות שעונים</h1>
        <p className="mb-6 text-ink-2">ערכו את שם התמהיל, סימון המומלץ ואחוזי המסלולים. כפילויות מסומנות — מומלץ להחליפן לאחר אישור הלקוח.</p>
        <div className="space-y-4">
          {templates.map((t) => {
            const sum = t.routes.reduce((s, rt) => s + Number(rt.sharePct || 0), 0);
            return (
              <form key={t.id} action={updateTemplate.bind(null, t.id)} className="card rounded-2xl p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <input name="name" defaultValue={t.name}
                    className="display min-w-[10rem] flex-1 rounded-lg border border-rule-strong bg-paper px-3 py-1.5 text-lg font-bold outline-none focus:border-manager" />
                  {t.duplicate_of && (
                    <span className="rounded-md border border-risk-high px-1.5 py-0.5 text-[10px] font-bold text-risk-high">
                      כפיל של {CLOCK_LABEL[t.duplicate_of] ?? t.duplicate_of}
                    </span>
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  {t.routes.map((rt, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-28 shrink-0">{TRACK_LABEL[rt.kind]}{rt.indexType === "מדד" ? " צמודה" : ""}</span>
                      <input name={`share_${i}`} type="number" min={0} max={100} defaultValue={rt.sharePct}
                        className="num w-20 rounded-lg border border-rule-strong bg-paper px-2.5 py-1.5 outline-none focus:border-manager" />
                      <span className="text-ink-3">%</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="recommended" defaultChecked={t.recommended} className="accent-[var(--manager)]" /> מומלץ
                  </label>
                  <span className={`num text-xs ${sum === 100 ? "text-ink-3" : "text-risk-high"}`}>סכום אחוזים: {sum}%</span>
                  <button className="press rounded-lg bg-manager px-4 py-1.5 text-sm font-bold text-white hover:opacity-90">שמור</button>
                </div>
              </form>
            );
          })}
        </div>
      </main>
      <AppFooter />
    </>
  );
}
