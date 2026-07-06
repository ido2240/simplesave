import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import TemplateEditor, { type EditorTemplate, type EditorTrack } from "@/components/TemplateEditor";
import { requireRole } from "@/lib/session";
import { loadClockTemplates } from "@/lib/engine-config";

export default async function TemplatesPage() {
  await requireRole("admin");
  const templates = await loadClockTemplates();

  const editors: EditorTemplate[] = templates.map((t) => ({
    id: t.id,
    name: t.name,
    subtitle: t.subtitle ?? "",
    displayRisk: t.display_risk ?? 50,
    recommended: t.recommended,
    tracks: t.routes.map((rt): EditorTrack => ({
      kind: (rt.kind ?? "fixed") as EditorTrack["kind"],
      linked: rt.indexType === "מדד",
      sharePct: rt.sharePct,
    })),
  }));

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 sm:px-7">
        <Link href="/admin" className="lbl hover:text-manager">→ חזרה לניהול</Link>
        <h1 className="display mb-2 mt-2 text-4xl font-bold">תבניות שעונים</h1>
        <p className="mb-6 text-ink-2">
          עורך חזותי לחמשת התמהילים: מסלולים (עד 10), אחוזים, צמדה, סיכון מוצג ותמהיל מומלץ.
          שינויים מתומחרים מיד במנוע — העוגנים נמשכים חיים מ״פרמטרים כלכליים״.
        </p>
        <div className="space-y-5">
          {editors.map((t) => <TemplateEditor key={t.id} template={t} />)}
        </div>
      </main>
      <AppFooter />
    </>
  );
}
