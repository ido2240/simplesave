// Mock cookie session (demo auth) — the spec-allowed dev role switcher.
// A signed-in user is just a profile id stored in an httpOnly cookie. Production
// would replace this with Supabase Auth (GoTrue) + @supabase/ssr.
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabase } from "./supabase";

export const SESSION_COOKIE = "ss_uid";

export type Role = "client" | "advisor" | "admin";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export async function currentUser(): Promise<AppUser | null> {
  const jar = await cookies();
  const uid = jar.get(SESSION_COOKIE)?.value;
  if (!uid) return null;
  const { data } = await supabase()
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", uid)
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

export async function setSession(userId: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
