"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { requireRole } from "@/lib/session";

const ALLOWED = ["application/pdf", "image/jpeg", "image/png"];
const MAX_BYTES = 10 * 1024 * 1024;

/** Result surfaced inline in the upload form (useActionState) — expected,
 *  user-fixable failures return {ok:false} instead of throwing, so they never
 *  hit the global error boundary. */
export type UploadState = { ok: boolean; error?: string } | null;

export async function uploadDocument(docId: string, _prev: UploadState, formData: FormData): Promise<UploadState> {
  const user = await requireRole("client");
  const db = await supabaseServer();
  const { data: doc } = await db
    .from("documents").select("id, request_id, kind, requests!inner(client_id)").eq("id", docId).maybeSingle();
  const ownerId = (doc as { requests?: { client_id?: string } } | null)?.requests?.client_id;
  if (!doc || ownerId !== user.id) return { ok: false, error: "המסמך לא נמצא." };

  // Gate: every authorization must be signed first.
  const { data: auths } = await db.from("authorizations").select("signed").eq("request_id", doc.request_id);
  const allSigned = (auths ?? []).length > 0 && (auths ?? []).every((a) => a.signed);
  if (!allSigned) return { ok: false, error: "יש להשלים את חתימת כתבי ההרשאה לפני העלאת מסמכים." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "לא נבחר קובץ." };
  if (!ALLOWED.includes(file.type)) return { ok: false, error: "סוג קובץ לא נתמך — PDF, JPG או PNG בלבד." };
  if (file.size > MAX_BYTES) return { ok: false, error: "הקובץ חורג מ-10MB." };

  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${doc.request_id}/${docId}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: storageError } = await db.storage.from("documents").upload(path, bytes, { contentType: file.type, upsert: true });
  if (storageError) return { ok: false, error: "העלאת הקובץ נכשלה. נסו שוב." };

  // If this update fails the file sits in storage with a stale status — that
  // must surface as an error, not pass silently.
  const { error: updateError } = await db.from("documents")
    .update({ file_name: file.name, storage_path: path, status: "ממתין לבדיקה", note: null })
    .eq("id", docId);
  if (updateError) return { ok: false, error: "הקובץ נשמר אך עדכון הסטטוס נכשל. נסו שוב." };

  revalidatePath("/documents");
  revalidatePath(`/advisor/${doc.request_id}`);
  return { ok: true };
}
