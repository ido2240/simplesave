"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { requireRole } from "@/lib/session";
import type { RouteSpec } from "@/lib/engine";

/** Manager edits a clock template: name, recommended flag, and per-route shares.
 *  Route kinds/index types are preserved; only the percentages change. */
export async function updateTemplate(templateId: string, formData: FormData) {
  await requireRole("admin");
  const db = await supabaseServer();

  const { data: row } = await db
    .from("clock_templates").select("routes").eq("id", templateId).maybeSingle();
  if (!row) return;

  const routes = (row.routes as RouteSpec[]).map((spec, i) => ({
    ...spec,
    sharePct: Number(formData.get(`share_${i}`) ?? spec.sharePct),
  }));

  const name = String(formData.get("name") || "").trim();
  const recommended = formData.get("recommended") === "on";

  // recommended is exclusive — clear the flag on the others when one is chosen.
  if (recommended) await db.from("clock_templates").update({ recommended: false }).neq("id", templateId);

  await db.from("clock_templates")
    .update({ routes, ...(name ? { name } : {}), recommended })
    .eq("id", templateId);

  revalidatePath("/admin/templates");
}
