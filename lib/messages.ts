"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "./supabase-server";
import { requireUser } from "./session";

/** Post a message to a request thread (client or its advisor only). */
export async function sendMessage(requestId: string, formData: FormData) {
  const user = await requireUser();
  const body = String(formData.get("body") || "").trim();
  if (!body) return;
  const db = await supabaseServer();
  const { data: req } = await db.from("requests").select("client_id, advisor_id").eq("id", requestId).maybeSingle();
  if (!req || (req.client_id !== user.id && req.advisor_id !== user.id)) return;
  const { error } = await db.from("messages").insert({ request_id: requestId, author_id: user.id, body });
  // Surfaced by the global error boundary — a lost message must not look sent.
  if (error) throw new Error("שליחת ההודעה נכשלה. נסו שוב.");
  revalidatePath(`/advisor/${requestId}`);
  revalidatePath("/messages");
}

/** Mark everything the other side wrote in this thread as read (viewer opened it). */
export async function markThreadRead(requestId: string) {
  const user = await requireUser();
  const db = await supabaseServer();
  await db
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("request_id", requestId)
    .neq("author_id", user.id)
    .is("read_at", null);
}
