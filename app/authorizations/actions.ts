"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireRole } from "@/lib/session";

export async function signAuthorization(authId: string) {
  const user = await requireRole("client");
  const db = supabase();
  const { data: authz } = await db
    .from("authorizations")
    .select("id, request_id, requests!inner(client_id)")
    .eq("id", authId)
    .maybeSingle();
  // ownership check
  const ownerId = (authz as { requests?: { client_id?: string } } | null)?.requests?.client_id;
  if (!authz || ownerId !== user.id) return;
  await db.from("authorizations").update({ signed: true, signed_at: new Date().toISOString() }).eq("id", authId);
  revalidatePath("/authorizations");
  revalidatePath("/documents");
}
