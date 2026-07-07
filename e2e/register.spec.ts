// Registration UX + orphan-reclaim — merge-blocking checks (npm run test:e2e).
// A deleted-then-recreated account once failed with an opaque "ההרשמה נכשלה":
// deleting a user in the Auth dashboard left an orphaned profiles row (no FK
// to auth.users), and re-signup crashed on profiles_email_key inside the
// handle_new_user trigger (fixed in 0013). The form also gives live hints for
// the two most common mistakes: short password and mismatched confirmation.
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

function serviceDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required (see .env.local)");
  return createClient(url, key, { auth: { persistSession: false } });
}

test("live hints: short password and mismatched confirmation", async ({ page }) => {
  await page.goto("/register");
  // requirement hint is stated up front (incl. "no capital letter needed")
  await expect(page.getByText("לפחות 8 תווים — אין דרישה לאות גדולה")).toBeVisible();

  await page.fill('input[name="password"]', "abc");
  await expect(page.getByText(/חסרים עוד 5 תווים/)).toBeVisible();
  await page.fill('input[name="password"]', "abcdefgh");
  await expect(page.getByText("✓ אורך הסיסמה תקין")).toBeVisible();

  await page.fill('input[name="confirm"]', "abcdefgX");
  await expect(page.getByText("✗ הסיסמאות אינן תואמות")).toBeVisible();
  await page.fill('input[name="confirm"]', "abcdefgh");
  await expect(page.getByText("✓ הסיסמאות תואמות")).toBeVisible();
});

test("re-registering an email whose auth user was deleted succeeds", async ({ page }) => {
  const email = `orphan-${Date.now()}@test.simplesave.co.il`;
  const db = serviceDb();
  // simulate a dashboard-deleted user: profile row with no auth.users entry
  const { error: seedErr } = await db.from("profiles").insert({
    id: crypto.randomUUID(), email, full_name: "משתמש ישן", role: "client",
  });
  expect(seedErr).toBeNull();

  await page.goto("/register");
  await page.fill('input[name="fullName"]', "משתמש חוזר");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "Test1234!");
  await page.fill('input[name="confirm"]', "Test1234!");
  await page.check('input[name="consent"]');
  await page.getByRole("button", { name: "צור חשבון" }).click();
  await page.waitForURL("**/new-mortgage", { timeout: 60_000 });

  // cleanup: remove the fresh auth user + profile
  const { data: prof } = await db.from("profiles").select("id").eq("email", email).single();
  if (prof) {
    await db.auth.admin.deleteUser(prof.id).catch(() => {});
    await db.from("profiles").delete().eq("id", prof.id);
  }
});

test("registering an email that already has an account shows a clear message", async ({ page }) => {
  await page.goto("/register");
  await page.fill('input[name="fullName"]', "כפול");
  await page.fill('input[name="email"]', "yossi@simplesave.co.il"); // seeded demo user
  await page.fill('input[name="password"]', "Test1234!");
  await page.fill('input[name="confirm"]', "Test1234!");
  await page.check('input[name="consent"]');
  await page.getByRole("button", { name: "צור חשבון" }).click();
  await expect(page.getByText("כבר קיים חשבון עם האימייל הזה")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("link", { name: /למעבר לכניסה/ })).toBeVisible();
});
