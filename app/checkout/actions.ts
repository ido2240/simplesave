"use server";

import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requireRole } from "@/lib/session";

export async function startCheckout() {
  const user = await requireRole("client");
  const { data: req } = await supabase()
    .from("requests").select("id").eq("client_id", user.id)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!req) redirect("/new-mortgage");
  redirect(`/checkout/hosted?rid=${req.id}`);
}

/** Server-side confirmation — the only path that unlocks the service. Sandbox
 *  payment provider for now; swap for a real PSP (e.g. Stripe) in production. */
export async function confirmPayment(requestId: string) {
  const user = await requireRole("client");
  const db = supabase();
  const { data: req } = await db.from("requests").select("id, client_id").eq("id", requestId).maybeSingle();
  if (!req || req.client_id !== user.id) redirect("/checkout");
  await db.from("requests").update({ service_status: "PAID", status: "active" }).eq("id", requestId);
  redirect("/personal");
}
