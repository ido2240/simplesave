"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase-server";
import { requireRole } from "@/lib/session";
import type { RouteSpec } from "@/lib/engine";

// Visual template editor payload: full track list (≤10), display metadata.
const trackSchema = z.object({
  kind: z.enum(["fixed", "variable", "prime"]),
  linked: z.boolean(),
  sharePct: z.number().min(0).max(100),
});
const tracksSchema = z.array(trackSchema).min(1).max(10);

/** Rebuild a RouteSpec from the editor's track row, using the same defaults
 *  as the seed templates (anchors are overridden live by kind anyway). */
function toRouteSpec(t: z.infer<typeof trackSchema>): RouteSpec {
  if (t.kind === "prime") {
    return { kind: "prime", sharePct: t.sharePct, indexType: "ללא", changeMonths: 1, yearStep: 10, anchorType: "פריים", anchor: 0.0456, margin: 0 };
  }
  if (t.kind === "variable") {
    return { kind: "variable", sharePct: t.sharePct, indexType: t.linked ? "מדד" : "ללא", changeMonths: 60, yearStep: 5, anchorType: 'אג"ח', anchor: 0.047, margin: 0 };
  }
  return { kind: "fixed", sharePct: t.sharePct, indexType: t.linked ? "מדד" : "ללא", yearStep: 5, anchor: 0.0462 };
}

export interface TemplateSaveState {
  error?: string;
  saved?: string; // template id that was saved
}

export async function updateTemplate(
  templateId: string,
  _prev: TemplateSaveState | undefined,
  formData: FormData,
): Promise<TemplateSaveState> {
  await requireRole("admin");
  const db = await supabaseServer();

  let tracks: z.infer<typeof tracksSchema>;
  try {
    tracks = tracksSchema.parse(JSON.parse(String(formData.get("tracks") || "[]")));
  } catch {
    return { error: "מסלולים לא תקינים — עד 10 מסלולים, אחוזים בין 0 ל-100." };
  }
  const sum = tracks.reduce((s, t) => s + t.sharePct, 0);
  if (Math.round(sum) !== 100) return { error: `סכום האחוזים חייב להיות 100% (כרגע ${Math.round(sum)}%).` };

  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "יש להזין שם תמהיל." };
  const subtitle = String(formData.get("subtitle") || "").trim() || null;
  const displayRisk = Math.max(0, Math.min(100, Number(formData.get("display_risk") || 0)));
  const recommended = formData.get("recommended") === "on";

  // recommended is exclusive — clear the flag on the others when one is chosen.
  if (recommended) await db.from("clock_templates").update({ recommended: false }).neq("id", templateId);

  const { error } = await db.from("clock_templates")
    .update({ routes: tracks.map(toRouteSpec), name, subtitle, display_risk: displayRisk, recommended })
    .eq("id", templateId);
  if (error) return { error: "השמירה נכשלה. נסו שוב." };

  revalidatePath("/admin/templates");
  revalidatePath("/new-mortgage/clocks");
  return { saved: templateId };
}
