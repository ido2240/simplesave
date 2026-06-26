"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { requireRole } from "@/lib/session";

export async function updateParams(formData: FormData) {
  await requireRole("admin");
  const cpi = Number(formData.get("cpi") || 0) / 100;
  const usd = Number(formData.get("usd") || 0) / 100;
  const eur = Number(formData.get("eur") || 0) / 100;
  const primeRate = Number(formData.get("primeRate") || 0) / 100;
  const fixedAnchor = Number(formData.get("fixedAnchor") || 0) / 100;
  const variableAnchor = Number(formData.get("variableAnchor") || 0) / 100;
  await (await supabaseServer()).from("economic_params").upsert({
    id: "singleton", cpi, usd, eur,
    prime_rate: primeRate, fixed_anchor: fixedAnchor, variable_anchor: variableAnchor,
  });
  revalidatePath("/admin/params");
  revalidatePath("/new-mortgage/clocks");
  revalidatePath("/refinance");
}

export async function assignAdvisor(requestId: string, formData: FormData) {
  await requireRole("admin");
  const advisorId = String(formData.get("advisorId") || "") || null;
  await (await supabaseServer()).from("requests").update({ advisor_id: advisorId }).eq("id", requestId);
  revalidatePath("/admin/leads");
}
