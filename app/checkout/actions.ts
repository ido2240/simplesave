"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { requireRole } from "@/lib/session";

export async function startCheckout() {
  const user = await requireRole("client");
  const { data: req } = await (await supabaseServer())
    .from("requests").select("id, service_status").eq("client_id", user.id)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!req) redirect("/new-mortgage");
  if (req.service_status === "PAID") redirect("/personal");
  redirect(`/checkout/hosted?rid=${req.id}`);
}

/** Server-side confirmation — the only path that unlocks the service. Sandbox
 *  payment provider for now; swap for a real PSP (e.g. Stripe) in production. */
export async function confirmPayment(requestId: string) {
  const user = await requireRole("client");
  const db = await supabaseServer();
  const { data: req } = await db
    .from("requests").select("id, client_id, service_status").eq("id", requestId).maybeSingle();
  if (!req || req.client_id !== user.id) redirect("/checkout");
  if (req.service_status !== "PAID") {
    // Read the row back: a write silently rejected (RLS, network) must surface
    // as a checkout error, not strand the user in an unpaid redirect loop.
    const { data: updated, error } = await db
      .from("requests")
      .update({ service_status: "PAID", status: "active" })
      .eq("id", requestId)
      .select("service_status")
      .maybeSingle();
    if (error || updated?.service_status !== "PAID") redirect("/checkout?error=payment");
  }
  await ensureOnboardingRows(requestId);
  redirect("/personal?paid=1");
}

/** A paid request must never unlock into an empty service area: requests that
 *  predate the questionnaire's child-row inserts get the default
 *  authorizations/documents provisioned here. */
async function ensureOnboardingRows(requestId: string) {
  const db = await supabaseServer();
  const [{ count: auths }, { count: docs }] = await Promise.all([
    db.from("authorizations").select("*", { count: "exact", head: true }).eq("request_id", requestId),
    db.from("documents").select("*", { count: "exact", head: true }).eq("request_id", requestId),
  ]);
  if (!auths) {
    await db.from("authorizations").insert([
      { request_id: requestId, bank: "בנק הפועלים" },
      { request_id: requestId, bank: "בנק לאומי" },
      { request_id: requestId, bank: "מזרחי טפחות" },
    ]);
  }
  if (!docs) {
    await db.from("documents").insert([
      { request_id: requestId, kind: "תעודת זהות" },
      { request_id: requestId, kind: "תלושי שכר (3 אחרונים)" },
      { request_id: requestId, kind: "דפי חשבון בנק" },
    ]);
  }
}
