// Server-side paywall gate. Free tier = questionnaire + 5 clocks; the full
// service (authorizations, documents, advisor) requires payment.
import "server-only";
import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase-server";

export const SERVICE_PRICE_ILS = 990;

export async function isPaid(requestId: string): Promise<boolean> {
  const { data } = await (await supabaseServer()).from("requests").select("service_status").eq("id", requestId).maybeSingle();
  return data?.service_status === "PAID";
}

export async function requirePaid(requestId: string): Promise<void> {
  if (!(await isPaid(requestId))) redirect("/checkout");
}
