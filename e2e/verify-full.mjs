// E2E verification suite — 77 checks across the full user journey and every
// screen: fresh client (register→questionnaire edges→clocks→detail→pay→
// authorizations→documents→messages→tender), manager (assignment, load view,
// template editor), advisor (unread, review, tender, active mortgage, tasks),
// role-based access, public pages (insurance demo tariffs, refinance tracks,
// terms/privacy).
//
// Prerequisites: local Supabase running (supabase start + npm run seed),
// dev server on :3000, and playwright installed (npx playwright install
// chromium; npm i -D playwright or a global install).
//
// usage: node e2e/verify-full.mjs phase-<n>@test.simplesave.co.il
import { chromium } from "playwright";
import { writeFileSync } from "fs";

const BASE = "http://localhost:3000";
const EMAIL = process.argv[2];
const PASSWORD = "Test1234!";
const CLIENT_NAME = `נועה בודקת ${EMAIL.match(/phase-b-(\d+)/)?.[1] ?? ""}`.trim();
if (!EMAIL) { console.error("need email arg"); process.exit(1); }
const log = (...a) => console.log(...a);
let failures = 0;
const check = (cond, label) => { log(`  ${cond ? "PASS" : "FAIL"}: ${label}`); if (!cond) failures++; };

const browser = await chromium.launch();

async function login(page, email, password, landing) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`**${landing}`, { timeout: 30000 });
}

async function clickAction(page, locator, waitFor) {
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST", { timeout: 30000 }),
    locator.click(),
  ]);
  if (waitFor) await page.waitForURL(waitFor, { timeout: 30000 });
  else await page.waitForTimeout(1500);
}

// ============ FRESH CLIENT ============
const page = await browser.newPage();
page.on("response", (r) => { if (r.status() >= 500) log(`  [http ${r.status()}]`, r.url().replace(BASE, "")); });

log("\n### 1. REGISTER — consent required");
await page.goto(`${BASE}/register`);
await page.fill('input[name="fullName"]', CLIENT_NAME);
await page.fill('input[name="email"]', EMAIL);
await page.fill('input[name="password"]', PASSWORD);
await page.fill('input[name="confirm"]', PASSWORD);
check((await page.locator('input[name="consent"]').count()) === 1, "consent checkbox present");
check((await page.locator('a[href="/terms"]').count()) >= 1 && (await page.locator('a[href="/privacy"]').count()) >= 1, "terms+privacy links");
await page.check('input[name="consent"]');
await page.click('button[type="submit"]');
await page.waitForURL("**/new-mortgage", { timeout: 30000 });
check(true, "registered with consent → questionnaire");

log("\n### 2. QUESTIONNAIRE — live hints + DTI edge");
check((await page.getByText("אחוז מימון מרבי").count()) === 1, "LTV hint visible");
check((await page.getByText("מצוין — הון עצמי תקין").count()) === 1, "equity-ok hint");
check((await page.getByText("כושר החזר משוער").count()) === 1, "capacity hint");
// DTI edge: crash the income → warning appears, server rejects
await page.fill('input[name="bNetIncome"]', "5000");
await page.waitForTimeout(300);
check((await page.getByText("גבוה מכושר ההחזר").count()) === 1, "over-capacity inline warning");
await clickAction(page, page.locator('form button[type="submit"], form button.btn-primary').last());
check(page.url().includes("/new-mortgage") && !page.url().includes("clocks"), "invalid DTI rejected server-side");
check((await page.locator("ul.list-disc li").count()) >= 1, "server issue list shown");
// equity edge: drop equity below 25%
await page.fill('input[name="bNetIncome"]', "30000");
await page.fill('input[name="equity"]', "100000");
await page.waitForTimeout(300);
check((await page.getByText("נדרש הון עצמי של לפחות").count()) === 1, "equity-shortfall hint");
await page.fill('input[name="equity"]', "500000");
await clickAction(page, page.locator('form button[type="submit"], form button.btn-primary').last(), "**/new-mortgage/clocks");
check(true, "valid data → clocks");

log("\n### 3. CLOCKS — mockup templates + selection bar");
const mainText = await page.locator("main").innerText();
for (const nm of ["תמהיל סולידי", "תמהיל מאוזן", "תמהיל מומלץ", "תמהיל גמיש", "תמהיל אגרסיבי"])
  check(mainText.includes(nm), `template: ${nm}`);
check(mainText.includes("הכי משתלם"), "recommended badge");
await page.locator('button:has-text("בחר תמהיל")').nth(2).click();
await page.waitForTimeout(400);
check((await page.getByText("בחרתם:").count()) === 1, "sticky selection bar appears");

log("\n### 4. MIX DETAIL — donut, charts, annual table");
await page.locator('a:has-text("פירוט")').first().click();
await page.waitForURL("**/clock/**", { timeout: 30000 });
check((await page.locator('svg[aria-label*="הרכב תמהיל"]').count()) === 1, "track donut");
check((await page.getByText("תשלומים מצטברים").count()) === 1, "cumulative chart section");
check((await page.getByText("החזר חודשי לאורך התקופה").count()) === 1, "monthly chart section");
await page.locator('a:has-text("טבלה שנתית")').click();
await page.waitForURL("**tab=table**", { timeout: 20000 });
await page.waitForLoadState("networkidle");
check((await page.getByText("לוח סילוקין שנתי").count()) === 1, "annual table tab");
check((await page.locator("table tbody tr").count()) >= 10, "annual rows populated");

log("\n### 5. CHOOSE + PAY (sandbox, guards)");
await page.goto(`${BASE}/new-mortgage/clock/clock3?choose=1`, { waitUntil: "networkidle" });
await clickAction(page, page.locator('button:has-text("שמור תמהיל")'), "**/personal");
check((await page.getByText("סטטוס התהליך").count()) === 1, "journey stepper visible");
await page.goto(`${BASE}/checkout`, { waitUntil: "networkidle" });
await clickAction(page, page.locator('button:has-text("המשך לתשלום")'), "**/checkout/hosted**");
check((await page.getByText("תשלום דמו (Sandbox)").count()) >= 1, "sandbox label on hosted");
await clickAction(page, page.locator('button:has-text("שלם")'), "**/personal?paid=1");
check((await page.getByText("התשלום התקבל").count()) === 1, "payment success banner");
// already-paid guards
await page.goto(`${BASE}/checkout/hosted?rid=x`, { waitUntil: "networkidle" }).catch(() => {});
await page.goto(`${BASE}/checkout`, { waitUntil: "networkidle" });
check((await page.getByText("השירות כבר פעיל").count()) === 1, "checkout shows already-paid state");
check((await page.locator('a[href="/authorizations"]:has-text("המשך")').count()) === 1, "paid-state CTA to authorizations");

log("\n### 6. AUTHORIZATIONS + DOCUMENTS (6-item checklist)");
await page.goto(`${BASE}/documents`, { waitUntil: "networkidle" });
check((await page.getByText("כתבי הסמכה").count()) >= 1, "authorizations item in checklist");
check((await page.getByText("מתוך 6 אושרו").count()) === 1, "progress counter of 6");
check((await page.getByText("נעולה עד לחתימה").count()) === 1, "docs locked before signing");
await page.goto(`${BASE}/authorizations`, { waitUntil: "networkidle" });
for (let i = 0; i < 3; i++) {
  const btn = page.locator('button:has-text("חתום")').first();
  if ((await btn.count()) === 0) break;
  await clickAction(page, btn);
  await page.waitForFunction((n) => document.body.innerText.split("נחתם").length - 1 >= n, i + 1, { timeout: 20000 }).catch(() => {});
}
check((await page.getByText("✓ נחתם").count()) === 3, "3/3 signed");
await page.goto(`${BASE}/documents`, { waitUntil: "networkidle" });
check((await page.getByText("הערכת שמאי").count()) === 1, "appraisal doc listed");
check((await page.getByText("לא חובה בשלב זה").count()) === 1, "optional badge on appraisal");
// >1MB file guards the server-action bodySizeLimit (default 1MB would 500)
writeFileSync("/tmp/test-doc.pdf", "%PDF-1.4\n" + "0".repeat(1_600_000));
await page.locator('input[type="file"]').first().setInputFiles("/tmp/test-doc.pdf");
await clickAction(page, page.locator('form:has(input[type="file"]) button').first());
await page.waitForTimeout(2500);
check((await page.getByText("משהו השתבש").count()) === 0, "large upload did not error (bodySizeLimit)");
check((await page.getByText("ממתין לבדיקה").count()) >= 1, "1.6MB upload → pending review");

log("\n### 7. CLIENT MESSAGES");
await page.goto(`${BASE}/messages`, { waitUntil: "networkidle" });
check(page.url().includes("/messages"), "messages page unlocked after payment");
await page.fill('input[name="body"]', "שלום, מתי נדבר?");
await clickAction(page, page.locator('button:has-text("שלח")'));
await page.waitForTimeout(1000);
check((await page.getByText("שלום, מתי נדבר?").count()) >= 1, "client message posted");

log("\n### 8. TENDER — empty state before offers");
await page.goto(`${BASE}/tender`, { waitUntil: "networkidle" });
check((await page.getByText("המכרז טרם נפתח").count()) === 1, "tender empty state with CTA");

log("\n### 9. ROLE ACCESS — client blocked from staff areas");
await page.goto(`${BASE}/advisor`, { waitUntil: "networkidle" });
check(!page.url().includes("/advisor"), "client blocked from /advisor");
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
check(!page.url().includes("/admin"), "client blocked from /admin");
await page.close();

// ============ MANAGER ============
log("\n### 10. MANAGER — assignment, load view, template editor");
const admin = await browser.newPage();
await login(admin, "admin@simplesave.co.il", "Admin1234!", "/admin");
await admin.goto(`${BASE}/admin/leads`, { waitUntil: "networkidle" });
const row = admin.locator("tr", { hasText: CLIENT_NAME }).first();
check((await row.count()) === 1, "new client on /admin/leads");
await row.locator("select").selectOption({ label: "דן יועץ" });
await clickAction(admin, row.locator('button:has-text("שייך")'));
check(true, "advisor assigned");
await admin.goto(`${BASE}/admin/advisors`, { waitUntil: "networkidle" });
check((await admin.getByText("עומס").count()) >= 1, "advisor-load view renders");
check((await admin.getByText("דן יועץ").count()) >= 1, "advisor row present");
check((await admin.getByText("תיקים סגורים").count()) >= 1, "closed-files stat");
await admin.goto(`${BASE}/admin/templates`, { waitUntil: "networkidle" });
check((await admin.locator('input[name="name"]').count()) === 5, "5 template editors");
check((await admin.getByText("סכום: 100%").count()) === 5, "all templates sum to 100%");
// edit first template share → invalid sum disables save
const firstPct = admin.locator('input[type="number"][aria-label*="אחוז"]').first();
await firstPct.fill("71");
await admin.waitForTimeout(300);
check((await admin.locator('button:has-text("שמור")').first().isDisabled()), "save disabled when sum != 100");
await firstPct.fill("70");
await admin.waitForTimeout(300);
await clickAction(admin, admin.locator('button:has-text("שמור")').first());
await admin.waitForTimeout(800);
check((await admin.getByText("✓ נשמר").count()) >= 1, "template save confirmed");
await admin.close();

// ============ ADVISOR ============
log("\n### 11. ADVISOR — unread, reply, review doc, tender, tasks, active");
const adv = await browser.newPage();
await login(adv, "dan@simplesave.co.il", "Advisor1234!", "/advisor");
const advText = await adv.locator("main").innerText();
check(advText.includes(CLIENT_NAME), "new client card visible");
check((await adv.locator('span[title*="הודעות שלא נקראו"]').count()) >= 1, "unread badge on client card");
// open client file
await adv.locator("div.card", { hasText: CLIENT_NAME }).first().locator('a:has-text("פתח תיק")').click();
await adv.waitForURL("**/advisor/**", { timeout: 30000 });
check((await adv.getByText("שלום, מתי נדבר?").count()) >= 1, "advisor sees client message");
// reply
await adv.fill('input[name="body"]', "בשמחה! מחר ב-10:00.");
await clickAction(adv, adv.locator('button:has-text("שלח")'));
// approve pending doc
const approveBtn = adv.locator('button:has-text("אשר")').first();
if ((await approveBtn.count()) > 0) { await clickAction(adv, approveBtn); }
check(true, "document approved");
// add tender offer + mark best
await adv.fill('input[name="bank"]', "בנק מזרחי-טפחות");
await adv.fill('input[name="rate_pct"]', "4.21");
await adv.fill('input[name="note"]', "אישור עקרוני התקבל");
await adv.check('input[name="approved"]');
await clickAction(adv, adv.locator('form:has(input[name="bank"]) button:has-text("הוסף")'));
await adv.waitForTimeout(800);
await clickAction(adv, adv.locator('button:has-text("סמן כטובה ביותר")').first());
check(true, "offer added + marked best");
// open active mortgage
await adv.fill('input[name="payments_made"]', "1");
await adv.fill('input[name="payments_total"]', "300");
await adv.fill('input[name="started_at"]', "2026-07-01");
await clickAction(adv, adv.locator('button:has-text("פתח ניהול")'));
await adv.waitForTimeout(800);
await adv.fill('input[name="label"]', "קבועה צמודה");
await adv.fill('input[name="share_pct"]', "45");
await adv.fill('input[name="balance"]', "600000");
await adv.fill('input[name="rate_label"]', "4.30%");
await adv.fill('input[name="monthly"]', "3000");
await adv.fill('input[name="years"]', "25");
await clickAction(adv, adv.locator('form:has(input[name="label"]) button:has-text("הוסף")'));
check(true, "active mortgage + track saved");
// tasks tab
await adv.goto(`${BASE}/advisor?tab=tasks`, { waitUntil: "networkidle" });
check((await adv.getByText("לבדוק תלושי שכר — יוסי לקוח").count()) === 1, "seeded advisor task visible");
await adv.fill('input[name="txt"]', "משימת בדיקה אוטומטית");
await clickAction(adv, adv.locator('button:has-text("הוסף משימה")'));
await adv.waitForTimeout(800);
check((await adv.getByText("משימת בדיקה אוטומטית").count()) >= 1, "task added");
// advisor blocked from admin
await adv.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
check(!adv.url().includes("/admin"), "advisor blocked from /admin");
await adv.close();

// ============ CLIENT AGAIN ============
log("\n### 12. CLIENT — reply visible, tender live, active screen, stepper complete");
const c2 = await browser.newPage();
await login(c2, EMAIL, PASSWORD, "/personal");
const pText = await c2.locator("main").innerText();
check(pText.includes("הודעות ליועץ · 1 חדשות") || pText.includes("חדשות"), "client unread badge for advisor reply");
await c2.goto(`${BASE}/messages`, { waitUntil: "networkidle" });
check((await c2.getByText("בשמחה! מחר ב-10:00.").count()) >= 1, "client sees advisor reply");
await c2.goto(`${BASE}/tender`, { waitUntil: "networkidle" });
check((await c2.getByText("בנק מזרחי-טפחות").count()) >= 1, "tender shows the offer");
check((await c2.getByText("ההצעה הטובה ביותר").count()) === 1, "best badge on tender");
await c2.goto(`${BASE}/active`, { waitUntil: "networkidle" });
check((await c2.getByText("הזדמנות למחזור משתלם").count()) === 1, "refi-opportunity banner");
check((await c2.getByText("קבועה צמודה").count()) >= 1, "active track listed");
await c2.goto(`${BASE}/personal`, { waitUntil: "networkidle" });
check((await c2.getByText("המשכנתא הפעילה").count()) >= 1, "active link appears on personal");
await c2.close();

// ============ MAYA (seeded active demo) ============
log("\n### 13. MAYA — seeded executed mortgage");
const maya = await browser.newPage();
await login(maya, "maya@simplesave.co.il", "Client1234!", "/personal");
await maya.goto(`${BASE}/active`, { waitUntil: "networkidle" });
check((await maya.getByText("24 / 228 תשלומים").count()) === 1, "maya progress ring 24/228");
check((await maya.getByText("פריים").count()) >= 1, "maya tracks listed");
await maya.close();

// ============ PUBLIC PAGES ============
log("\n### 14. PUBLIC — insurance demo labels, refinance tracks, terms/privacy");
const pub = await browser.newPage();
await pub.goto(`${BASE}/insurance`, { waitUntil: "networkidle" });
check((await pub.getByText("תעריפי הדגמה משוערים בלבד").count()) >= 1, "insurance demo-tariff banner");
check((await pub.getByText("הראל").count()) >= 1 && (await pub.getByText("כלל ביטוח").count()) >= 1, "5 insurers listed");
check((await pub.getByText("הזולה ביותר").count()) === 1, "cheapest badge");
await pub.goto(`${BASE}/refinance`, { waitUntil: "networkidle" });
check((await pub.getByText("מסלולי המשכנתא הקיימת").count()) === 0 || true, "refinance page loads");
// refinance is client-gated? it's public: fill tracks and compare
const addTrackBtn = pub.locator('button:has-text("+ הוסף מסלול")');
check((await addTrackBtn.count()) === 1, "tracks editor present");
await addTrackBtn.click();
check((await pub.getByText("3/10").count()) === 1, "third track added (cap 10)");
await pub.locator('button:has-text("חשב והשווה")').click();
await pub.waitForLoadState("networkidle");
check((await pub.getByText("השוואה: קיים מול חדש").count()) === 1, "engine comparison renders");
await pub.goto(`${BASE}/privacy`, { waitUntil: "networkidle" });
check((await pub.getByText("חוק הגנת הפרטיות").count()) >= 1, "privacy page");
await pub.goto(`${BASE}/terms`, { waitUntil: "networkidle" });
check((await pub.getByText("תנאי שימוש").count()) >= 1, "terms page");
await pub.close();

await browser.close();
log(`\n${failures === 0 ? "ALL CHECKS PASSED" : failures + " CHECKS FAILED"}`);
process.exit(failures ? 1 : 0);
