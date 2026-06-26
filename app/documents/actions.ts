"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireRole } from "@/lib/session";

const ALLOWED = ["application/pdf", "image/jpeg", "image/png"];
const MAX_BYTES = 10 * 1024 * 1024;

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

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("לא נבחר קובץ.");
  if (!ALLOWED.includes(file.type)) throw new Error("סוג קובץ לא נתמך — PDF, JPG או PNG בלבד.");
  if (file.size > MAX_BYTES) throw new Error("הקובץ חורג מ-10MB.");

  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${doc.request_id}/${docId}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await db.storage.from("documents").upload(path, bytes, { contentType: file.type, upsert: true });
  if (error) throw new Error("העלאת הקובץ נכשלה. נסו שוב.");

  await db.from("documents")
    .update({ file_name: file.name, storage_path: path, status: "ממתין לבדיקה", note: null })
    .eq("id", docId);
  revalidatePath("/documents");
  revalidatePath(`/advisor/${doc.request_id}`);
}
