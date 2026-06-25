"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireRole } from "@/lib/session";

export async function reviewDocument(docId: string, status: "תקין" | "דרוש תיקון", formData: FormData) {
  const user = await requireRole("advisor");
  const db = supabase();
  const { data: doc } = await db
    .from("documents").select("id, request_id, requests!inner(advisor_id)").eq("id", docId).maybeSingle();
  const advisorId = (doc as { requests?: { advisor_id?: string } } | null)?.requests?.advisor_id;
  if (!doc || advisorId !== user.id) return;
  const note = String(formData.get("note") || "").trim() || null;
  await db.from("documents").update({ status, note: status === "דרוש תיקון" ? note : null }).eq("id", docId);
  revalidatePath(`/advisor/${doc.request_id}`);
}
