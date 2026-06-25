"use server";

import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requireRole } from "@/lib/session";

export async function chooseClock(clockId: string) {
  const user = await requireRole("client");
  const db = supabase();
  const { data: req } = await db
    .from("requests").select("id").eq("client_id", user.id)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (req) {
    await db.from("requests").update({ chosen_clock_id: clockId, status: "registered" }).eq("id", req.id);
  }
  redirect("/personal");
}
