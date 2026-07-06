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

// ---- Bank tender (מכרז בנקים) ----

export async function addBankOffer(requestId: string, formData: FormData) {
  const ctx = await ownedRequest(requestId);
  if (!ctx) return;
  const bank = String(formData.get("bank") || "").trim();
  if (!bank) return;
  const rateRaw = String(formData.get("rate_pct") || "").trim();
  const { error } = await ctx.db.from("bank_offers").insert({
    request_id: requestId,
    bank,
    note: String(formData.get("note") || "").trim() || null,
    rate_pct: rateRaw ? Number(rateRaw) : null,
    approved: formData.get("approved") === "on",
  });
  if (error) throw new Error("הוספת הצעת הבנק נכשלה.");
  revalidatePath(`/advisor/${requestId}`);
  revalidatePath("/tender");
}

export async function markBestOffer(offerId: string, requestId: string) {
  const ctx = await ownedRequest(requestId);
  if (!ctx) return;
  // single best per request
  await ctx.db.from("bank_offers").update({ is_best: false }).eq("request_id", requestId);
  const { error } = await ctx.db.from("bank_offers").update({ is_best: true, approved: true }).eq("id", offerId).eq("request_id", requestId);
  if (error) throw new Error("סימון ההצעה הטובה ביותר נכשל.");
  revalidatePath(`/advisor/${requestId}`);
  revalidatePath("/tender");
}

export async function deleteBankOffer(offerId: string, requestId: string) {
  const ctx = await ownedRequest(requestId);
  if (!ctx) return;
  await ctx.db.from("bank_offers").delete().eq("id", offerId).eq("request_id", requestId);
  revalidatePath(`/advisor/${requestId}`);
  revalidatePath("/tender");
}

// ---- Executed (active) mortgage ----

export async function saveActiveMortgage(requestId: string, formData: FormData) {
  const ctx = await ownedRequest(requestId);
  if (!ctx) return;
  const { error } = await ctx.db.from("active_mortgages").upsert({
    request_id: requestId,
    payments_made: Number(formData.get("payments_made") || 0),
    payments_total: Number(formData.get("payments_total") || 0),
    started_at: String(formData.get("started_at") || "") || null,
  });
  if (error) throw new Error("שמירת נתוני המשכנתא הפעילה נכשלה.");
  // executed mortgage → journey complete
  await ctx.db.from("requests").update({ status: "active" }).eq("id", requestId);
  revalidatePath(`/advisor/${requestId}`);
  revalidatePath("/active");
  revalidatePath("/personal");
}

export async function addActiveTrack(requestId: string, formData: FormData) {
  const ctx = await ownedRequest(requestId);
  if (!ctx) return;
  const label = String(formData.get("label") || "").trim();
  if (!label) return;
  const { error } = await ctx.db.from("active_tracks").insert({
    request_id: requestId,
    label,
    share_pct: Number(formData.get("share_pct") || 0),
    balance: Number(formData.get("balance") || 0),
    rate_label: String(formData.get("rate_label") || "").trim(),
    monthly: Number(formData.get("monthly") || 0),
    years: Number(formData.get("years") || 0),
  });
  if (error) throw new Error("הוספת המסלול נכשלה — ודאו שנתוני המשכנתא הפעילה נשמרו קודם.");
  revalidatePath(`/advisor/${requestId}`);
  revalidatePath("/active");
}

export async function removeActiveTrack(trackId: string, requestId: string) {
  const ctx = await ownedRequest(requestId);
  if (!ctx) return;
  await ctx.db.from("active_tracks").delete().eq("id", trackId).eq("request_id", requestId);
  revalidatePath(`/advisor/${requestId}`);
  revalidatePath("/active");
}
