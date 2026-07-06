"use server";

import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase-server";
import type { Role } from "@/lib/session";
import { RATE_LIMIT_MESSAGE, rateLimitOk } from "@/lib/rate-limit";

// Demo accounts (real Supabase Auth identities — real passwords, not a mock bypass).
const DEMO_CREDENTIALS: Record<Role, { email: string; password: string; label: string }> = {
  admin: { email: "admin@simplesave.co.il", password: "Admin1234!", label: "מנהל" },
  advisor: { email: "dan@simplesave.co.il", password: "Advisor1234!", label: "יועץ · דן" },
  client: { email: "yossi@simplesave.co.il", password: "Client1234!", label: "לקוח · יוסי" },
};

async function destinationFor(sb: SupabaseClient): Promise<string> {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return "/";
  const { data } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (data?.role ?? user.user_metadata?.role) as Role | undefined;
  return role === "admin" ? "/admin" : role === "advisor" ? "/advisor" : "/personal";
}

export async function loginByEmail(_prev: string | undefined, formData: FormData) {
  const email = String(formData.get("email") || "").toLowerCase().trim();
  const password = String(formData.get("password") || "");
  if (!email || !password) return "יש להזין אימייל וסיסמה.";
  if (!(await rateLimitOk({ name: "login", limit: 10, windowMs: 60_000 }))) return RATE_LIMIT_MESSAGE;

  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return "אימייל או סיסמה שגויים.";
  redirect(await destinationFor(sb));
}

/** One-click sign-in for a demo role — performs a real password login. */
export async function quickLogin(role: Role) {
  const cred = DEMO_CREDENTIALS[role];
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email: cred.email, password: cred.password });
  if (error) redirect("/login");
  redirect(await destinationFor(sb));
}

export async function logout() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  redirect("/");
}
