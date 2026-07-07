// Questionnaire feasibility gate — merge-blocking check (npm run test:e2e).
// When the loan's minimum monthly payment (full 30-year spread at the live
// fixed anchor) exceeds the income capacity, the form must say so with
// actionable numbers and BLOCK the compute button; fixing any lever must
// re-enable it.
import { test, expect } from "@playwright/test";

test("infeasible loan blocks compute with actionable guidance", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', "yossi@simplesave.co.il");
  await page.fill('input[name="password"]', "Client1234!");
  await page.getByRole("button", { name: "כניסה", exact: true }).click();
  await page.waitForURL("**/personal", { timeout: 60_000 });

  await page.goto("/new-mortgage");
  await page.fill('input[name="propertyValue"]', "2000000");
  await page.fill('input[name="equity"]', "500000");   // → 1.5M loan, floor ≈ 7,700
  await page.fill('input[name="bNetIncome"]', "15000"); // → capacity 6,000

  const submit = page.locator("form > button").last();
  await expect(submit).toBeDisabled();
  await expect(submit).toHaveText(/לא ניתן לחשב תמהילים/);
  // the three levers are spelled out with numbers
  await expect(page.getByText(/להגדיל הון עצמי לכ-/)).toBeVisible();
  await expect(page.getByText(/להגדיל את ההכנסה נטו הכוללת לכ-/)).toBeVisible();
  await expect(page.getByText(/לצרף לווה נוסף/)).toBeVisible();

  // raising income past the stated requirement re-enables the button
  await page.fill('input[name="bNetIncome"]', "30000");
  await expect(submit).toBeEnabled();
  await expect(submit).toHaveText(/חשב חמישה תמהילים/);
});
