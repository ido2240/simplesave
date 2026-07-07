// Public calculators — merge-blocking checks (npm run test:e2e):
// (a) /refinance must show engine alternatives to ANONYMOUS visitors — RLS
//     once blocked clock_templates/economic_params for anon and the page
//     silently rendered only the existing-mortgage row (fixed in 0012).
// (b) both calculators end in a lead-capture card ("המשך עם יועץ") that
//     actually writes a lead, instead of dead-ending.
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const LEAD_PREFIX = "E2E ליד";

function serviceDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required (see .env.local)");
  return createClient(url, key, { auth: { persistSession: false } });
}

test.afterAll(async () => {
  // remove leads captured by this suite
  await serviceDb().from("leads").delete().like("full_name", `${LEAD_PREFIX}%`);
});

test("anonymous refinance shows existing vs 5 alternatives + lead card", async ({ page }) => {
  await page.goto("/refinance?balance=1550000&min=5000&max=8000&goal=savings&years=13&rate=5.31&indexed=0");
  await expect(page.locator("table tbody tr")).toHaveCount(6); // existing + 5 mixes
  await expect(page.getByText("פירוט התמהילים החלופיים")).toBeVisible();
  await expect(page.getByText("המשך עם יועץ")).toBeVisible();
});

test("refinance lead capture writes a lead", async ({ page }) => {
  const name = `${LEAD_PREFIX} מחזור`;
  await page.goto("/refinance?balance=1550000&min=5000&max=8000&goal=savings&years=13&rate=5.31&indexed=0");
  await page.fill('input[name="fullName"]', name);
  await page.fill('input[name="phone"]', "050-1112233");
  await page.getByRole("button", { name: /השאירו פרטים/ }).click();
  await expect(page.getByText("✓ קיבלנו את הפנייה")).toBeVisible({ timeout: 30_000 });

  const { data } = await serviceDb().from("leads").select("service_type, phone").eq("full_name", name);
  expect(data?.length).toBe(1);
  expect(data![0].service_type).toBe("refinance");
});

test("insurance shows demo-tariff disclaimer and captures a lead", async ({ page }) => {
  const name = `${LEAD_PREFIX} ביטוח`;
  await page.goto("/insurance");
  await expect(page.getByText("תעריפי הדגמה משוערים בלבד")).toBeVisible();
  await page.fill('input[name="fullName"]', name);
  await page.fill('input[name="phone"]', "0521234567");
  await page.getByRole("button", { name: /השאירו פרטים/ }).click();
  await expect(page.getByText("✓ קיבלנו את הפנייה")).toBeVisible({ timeout: 30_000 });

  const { data } = await serviceDb().from("leads").select("service_type").eq("full_name", name);
  expect(data?.length).toBe(1);
  expect(data![0].service_type).toBe("insurance");
});

test("invalid phone is rejected inline", async ({ page }) => {
  await page.goto("/insurance");
  await page.fill('input[name="fullName"]', `${LEAD_PREFIX} טלפון`);
  await page.fill('input[name="phone"]', "123");
  await page.getByRole("button", { name: /השאירו פרטים/ }).click();
  await expect(page.getByText("יש להזין מספר טלפון תקין")).toBeVisible({ timeout: 15_000 });
});
