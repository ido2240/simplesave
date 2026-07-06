"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { requireRole } from "@/lib/session";

export async function addTask(formData: FormData) {
  const user = await requireRole("advisor");
  const txt = String(formData.get("txt") || "").trim();
  if (!txt) return;
  const { error } = await (await supabaseServer()).from("advisor_tasks").insert({
    advisor_id: user.id,
    txt,
    due: String(formData.get("due") || "").trim(),
    urgent: formData.get("urgent") === "on",
  });
  if (error) throw new Error("הוספת המשימה נכשלה.");
  revalidatePath("/advisor");
}

export async function toggleTask(taskId: string, done: boolean) {
  const user = await requireRole("advisor");
  await (await supabaseServer())
    .from("advisor_tasks").update({ done }).eq("id", taskId).eq("advisor_id", user.id);
  revalidatePath("/advisor");
}

export async function deleteTask(taskId: string) {
  const user = await requireRole("advisor");
  await (await supabaseServer())
    .from("advisor_tasks").delete().eq("id", taskId).eq("advisor_id", user.id);
  revalidatePath("/advisor");
}
