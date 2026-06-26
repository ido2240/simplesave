"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { requireRole } from "@/lib/session";
import type { AppUser } from "@/lib/session";

/** Confirm the signed-in advisor owns this request; returns the db handle + advisor. */
async function ownedRequest(requestId: string): Promise<{ db: Awaited<ReturnType<typeof supabaseServer>>; user: AppUser } | null> {
  const user = await requireRole("advisor");
  const db = await supabaseServer();
  const { data } = await db.from("requests").select("advisor_id").eq("id", requestId).maybeSingle();
  if (!data || data.advisor_id !== user.id) return null;
  return { db, user };
}

export async function reviewDocument(docId: string, status: "תקין" | "דרוש תיקון", formData: FormData) {
  const user = await requireRole("advisor");
  const db = await supabaseServer();
  const { data: doc } = await db
    .from("documents").select("id, request_id, requests!inner(advisor_id)").eq("id", docId).maybeSingle();
  const advisorId = (doc as { requests?: { advisor_id?: string } } | null)?.requests?.advisor_id;
  if (!doc || advisorId !== user.id) return;
  const note = String(formData.get("note") || "").trim() || null;
  await db.from("documents").update({ status, note: status === "דרוש תיקון" ? note : null }).eq("id", docId);
  revalidatePath(`/advisor/${doc.request_id}`);
}

/** Advisor edits the client-entered questionnaire figures. */
export async function updateClientDetails(requestId: string, formData: FormData) {
  const ctx = await ownedRequest(requestId);
  if (!ctx) return;
  const patch = {
    property_value: Number(formData.get("property_value") || 0),
    equity: Number(formData.get("equity") || 0),
    loan_amount: Number(formData.get("loan_amount") || 0),
  };
  await ctx.db.from("request_details").update(patch).eq("request_id", requestId);
  revalidatePath(`/advisor/${requestId}`);
}

/** Advisor adds a collateral item (from the option list or a free-text requirement). */
export async function addSecurity(requestId: string, formData: FormData) {
  const ctx = await ownedRequest(requestId);
  if (!ctx) return;
  const preset = String(formData.get("preset") || "").trim();
  const custom = String(formData.get("custom") || "").trim();
  const description = custom || preset;
  if (!description) return;
  await ctx.db.from("securities").insert({ request_id: requestId, description, kind: custom ? "דרישה ידנית" : "נכס" });
  revalidatePath(`/advisor/${requestId}`);
}

export async function removeSecurity(securityId: string, requestId: string) {
  const ctx = await ownedRequest(requestId);
  if (!ctx) return;
  await ctx.db.from("securities").delete().eq("id", securityId).eq("request_id", requestId);
  revalidatePath(`/advisor/${requestId}`);
}
