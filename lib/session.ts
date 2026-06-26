// Real auth session, backed by Supabase Auth (GoTrue). The signed-in user is the
// JWT-validated auth user; the app role lives on the linked profiles row.
import "server-only";
import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase-server";

export type Role = "client" | "advisor" | "admin";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export async function currentUser(): Promise<AppUser | null> {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id, email: data.email, name: data.full_name, role: data.role as Role };
}

export async function requireUser(): Promise<AppUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(role: Role): Promise<AppUser> {
  const user = await requireUser();
  if (user.role !== role) redirect("/");
  return user;
}
