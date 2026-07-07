// Documents step — the client must be able to upload a file to EVERY one of
// the 5 document slots. A broken upload blocks documents → tracking → the
// whole client flow. Merge-blocking check (npm run test:e2e).
//
// Regression guard: upload files are deliberately LARGER than 1MB — Next's
// default server-action body limit once rejected them before the action ran
// (fixed via experimental.serverActions.bodySizeLimit in next.config.ts).
//
// Prerequisites: local Supabase stack (supabase start + npm run seed). The
// suite prepares Yossi's seeded request deterministically via the service
// role (paid + all authorizations signed + slots reset), then drives the UI.
import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const CLIENT_EMAIL = "yossi@simplesave.co.il";
const CLIENT_PASSWORD = "Client1234!";
const UPLOAD_OK = "✓ הקובץ הועלה בהצלחה";
const STATUS_PENDING_REVIEW = "ממתין לבדיקה";
const STATUS_NOT_UPLOADED = "לא הועלה";

// The mockup checklist — 5 uploadable rows (שמאי optional); the 6th item,
// כתבי הסמכה, derives from authorizations and has no upload form.
const EXPECTED_SLOTS = [
  "תדפיס עו״ש 3 חודשים",
  "תלושי שכר 3 חודשים",
  "צילום ת״ז + ספח",
  "חוזה רכישה",
  "הערכת שמאי",
];

function pdfBuffer(sizeBytes: number): Buffer {
  const header = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  const filler = Buffer.alloc(Math.max(0, sizeBytes - header.length - 8), 0x20);
  return Buffer.concat([header, filler, Buffer.from("\n%%EOF\n")]);
}

async function loginAsClient(page: Page) {
  await page.goto("/login");
  await page.fill('input[name="email"]', CLIENT_EMAIL);
  await page.fill('input[name="password"]', CLIENT_PASSWORD);
  await page.getByRole("button", { name: "כניסה", exact: true }).click();
  await page.waitForURL("**/personal", { timeout: 60_000 });
}

// Deterministic setup: Yossi's seeded request is unpaid with unsigned auths —
// mark it paid, sign every authorization, and reset the 5 slots to empty.
test.beforeAll(async () => {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required (see .env.local)");
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: profile } = await db.from("profiles").select("id").eq("email", CLIENT_EMAIL).single();
  const { data: req } = await db.from("requests").select("id")
    .eq("client_id", profile!.id).order("created_at", { ascending: false }).limit(1).single();
  const rid = req!.id;

  await db.from("requests").update({ service_status: "PAID", status: "active" }).eq("id", rid);
  await db.from("authorizations").update({ signed: true, signed_at: new Date().toISOString() }).eq("request_id", rid);
  await db.from("documents")
    .update({ status: STATUS_NOT_UPLOADED, file_name: null, storage_path: null, note: null })
    .eq("request_id", rid);
});

test.describe.configure({ mode: "serial" });

test("client uploads a >1MB file to each of the 5 document slots", async ({ page }) => {
  await loginAsClient(page);
  await page.goto("/documents");

  const rows = page.locator("li", { has: page.locator('input[type="file"]') });
  await expect(rows).toHaveCount(EXPECTED_SLOTS.length);
  for (const kind of EXPECTED_SLOTS) {
    await expect(page.locator("li", { hasText: kind }).first(), `slot "${kind}" must exist`).toBeVisible();
  }

  for (let i = 0; i < EXPECTED_SLOTS.length; i++) {
    const row = rows.nth(i);
    await row.locator('input[type="file"]').setInputFiles({
      name: `e2e-slot-${i + 1}.pdf`,
      mimeType: "application/pdf",
      buffer: pdfBuffer(1_200_000), // > the old 1MB action body limit
    });
    await row.getByRole("button", { name: /העלה|החלף/ }).click();
    await expect(row.getByText(UPLOAD_OK)).toBeVisible({ timeout: 120_000 });
    await expect(row.getByText(STATUS_PENDING_REVIEW)).toBeVisible();
    await expect(row.getByText(`e2e-slot-${i + 1}.pdf`)).toBeVisible();
  }

  // Nothing may be left un-uploaded once every slot has a file.
  await expect(page.getByText(STATUS_NOT_UPLOADED, { exact: true })).toHaveCount(0);
});

test("oversized file (>10MB) is rejected inline before submit", async ({ page }) => {
  await loginAsClient(page);
  await page.goto("/documents");

  const row = page.locator("li", { has: page.locator('input[type="file"]') }).first();
  await row.locator('input[type="file"]').setInputFiles({
    name: "too-big.pdf",
    mimeType: "application/pdf",
    buffer: pdfBuffer(11 * 1024 * 1024),
  });
  // The client-side guard fires on change — clears the input, shows a message.
  await expect(row.getByText("הקובץ גדול מ-10MB. נסו קובץ קטן יותר.")).toBeVisible({ timeout: 10_000 });
  await expect(page).toHaveURL(/\/documents$/); // still here, no error screen
});

test("unsupported file type is rejected inline before submit", async ({ page }) => {
  await loginAsClient(page);
  await page.goto("/documents");

  const row = page.locator("li", { has: page.locator('input[type="file"]') }).first();
  await row.locator('input[type="file"]').setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not a document"),
  });
  await expect(row.getByText("סוג קובץ לא נתמך — PDF, JPG או PNG בלבד.")).toBeVisible({ timeout: 10_000 });
  await expect(page).toHaveURL(/\/documents$/);
});
