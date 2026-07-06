"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { requireRole } from "@/lib/session";

export async function chooseClock(clockId: string) {
  const user = await requireRole("client");
  const db = await supabaseServer();
  const { data: req } = await db
    .from("requests").select("id").eq("client_id", user.id)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!req) redirect("/new-mortgage");
  const { data: updated, error } = await db
    .from("requests")
    .update({ chosen_clock_id: clockId, status: "registered" })
    .eq("id", req.id)
    .select("chosen_clock_id")
    .maybeSingle();
  // Surface a failed write instead of landing on /personal with no chosen mix.
  if (error || updated?.chosen_clock_id !== clockId) redirect(`/new-mortgage/clock/${clockId}?choose=1&error=save`);
  redirect("/personal");
}
