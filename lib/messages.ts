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
  await db.from("messages").insert({ request_id: requestId, author_id: user.id, body });
  revalidatePath(`/advisor/${requestId}`);
}
