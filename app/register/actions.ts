"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { RATE_LIMIT_MESSAGE, rateLimitOk } from "@/lib/rate-limit";

export async function registerUser(_prev: string | undefined, formData: FormData) {
  const fullName = String(formData.get("fullName") || "").trim();
  const email = String(formData.get("email") || "").toLowerCase().trim();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  const consent = formData.get("consent") === "on";

  if (!fullName || !email || !password) return "יש למלא שם, אימייל וסיסמה.";
  if (password.length < 8) return "הסיסמה חייבת לכלול לפחות 8 תווים.";
  if (password !== confirm) return "הסיסמאות אינן תואמות.";
  if (!consent) return "יש לאשר את תנאי השימוש ומדיניות הפרטיות.";
  if (!(await rateLimitOk({ name: "register", limit: 5, windowMs: 60_000 }))) return RATE_LIMIT_MESSAGE;

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
  // Consent stamp (Takana 13 / terms) on the fresh profile.
  const { data: { user } } = await sb.auth.getUser();
  if (user) await sb.from("profiles").update({ accepted_terms_at: new Date().toISOString() }).eq("id", user.id);
  redirect("/new-mortgage");
}
