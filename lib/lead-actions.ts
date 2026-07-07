"use server";

import { supabaseServer } from "@/lib/supabase-server";

/** Result surfaced inline in the lead-capture form (useActionState). */
export type LeadState = { ok: boolean; error?: string } | null;

export async function submitCalculatorLead(
  service: "refinance" | "insurance",
  context: string,
  _prev: LeadState,
  formData: FormData,
): Promise<LeadState> {
  const fullName = String(formData.get("fullName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  if (fullName.length < 2) return { ok: false, error: "יש להזין שם מלא." };
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 10 || !digits.startsWith("0")) {
    return { ok: false, error: "יש להזין מספר טלפון תקין." };
  }

  const db = await supabaseServer();
  const { error } = await db.from("leads").insert({
    service_type: service,
    full_name: fullName,
    phone,
    questionnaire: { context },
  });
  if (error) return { ok: false, error: "שליחת הפנייה נכשלה. נסו שוב." };
  return { ok: true };
}
