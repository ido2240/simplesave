"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireRole } from "@/lib/session";

export async function uploadDocument(docId: string, formData: FormData) {
  const user = await requireRole("client");
  const db = supabase();
  const { data: doc } = await db
    .from("documents").select("id, request_id, kind, requests!inner(client_id)").eq("id", docId).maybeSingle();
  const ownerId = (doc as { requests?: { client_id?: string } } | null)?.requests?.client_id;
  if (!doc || ownerId !== user.id) return;

  // Gate: every authorization must be signed first.
  const { data: auths } = await db.from("authorizations").select("signed").eq("request_id", doc.request_id);
  const allSigned = (auths ?? []).length > 0 && (auths ?? []).every((a) => a.signed);
  if (!allSigned) throw new Error("יש להשלים את חתימת כתבי ההרשאה לפני העלאת מסמכים.");

  const fileName = String(formData.get("fileName") || `${doc.kind}.pdf`);
  await db.from("documents").update({ file_name: fileName, status: "ממתין לבדיקה", note: null }).eq("id", docId);
  revalidatePath("/documents");
}
