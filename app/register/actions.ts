"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";

export async function registerUser(_prev: string | undefined, formData: FormData) {
  const fullName = String(formData.get("fullName") || "").trim();
  const email = String(formData.get("email") || "").toLowerCase().trim();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  if (!fullName || !email || !password) return "יש למלא שם, אימייל וסיסמה.";
  if (password.length < 8) return "הסיסמה חייבת לכלול לפחות 8 תווים.";
  if (password !== confirm) return "הסיסמאות אינן תואמות.";

  const sb = await supabaseServer();
  const { error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role: "client" } },
  });
  if (error) {
    if (error.message.toLowerCase().includes("already")) return "כבר קיים משתמש עם האימייל הזה.";
    return "ההרשמה נכשלה. נסו שוב.";
  }

  // The DB triggers create + confirm the profile; sign in to start a session.
  const { error: signInError } = await sb.auth.signInWithPassword({ email, password });
  if (signInError) return "נרשמת בהצלחה — נסו להתחבר.";
  redirect("/new-mortgage");
}
