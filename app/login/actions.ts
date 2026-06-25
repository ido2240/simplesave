"use server";

import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { setSession, clearSession, type Role } from "@/lib/session";

const DEMO_EMAIL: Record<Role, string> = {
  admin: "admin@simplesave.co.il",
  advisor: "dan@simplesave.co.il",
  client: "yossi@simplesave.co.il",
};

export async function loginByEmail(_prev: string | undefined, formData: FormData) {
  const email = String(formData.get("email") || "").toLowerCase().trim();
  if (!email) return "יש להזין אימייל.";
  const { data } = await supabase().from("profiles").select("id").eq("email", email).maybeSingle();
  if (!data) return "לא נמצא משתמש עם האימייל הזה.";
  await setSession(data.id);
  redirect("/");
}

export async function quickLogin(role: Role) {
  const { data } = await supabase().from("profiles").select("id").eq("email", DEMO_EMAIL[role]).maybeSingle();
  if (data) await setSession(data.id);
  redirect("/");
}

export async function logout() {
  await clearSession();
  redirect("/");
}
