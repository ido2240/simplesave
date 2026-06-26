import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { currentUser } from "@/lib/session";

const SERVICES = [
  {
    href: "/new-mortgage",
    title: "משכנתא חדשה",
    desc: "השוואת תמהילים וחישוב המשכנתא המיטבית לרכישת נכס.",
    grad: "from-primary-2 to-primary-deep",
    dot: "var(--primary)",
    features: ["5 תמהילים מותאמים אישית", "חישוב החזר חודשי וכושר החזר", "בדיקת זכאות משרד השיכון"],
    icon: (
      <>
        <path d="M4 13 12 6l8 7" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 11.5V19h12v-7.5" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  {
    href: "/refinance",
    title: "מחזור משכנתא",
    desc: "בדיקת כדאיות והקטנת ההחזר החודשי על משכנתא קיימת.",
    grad: "from-[#1fb47b] to-[#0e7a50]",
    dot: "var(--refi)",
    features: ["ניתוח המשכנתא הקיימת", "חישוב חיסכון פוטנציאלי", "מכרז ריביות בין הבנקים"],
    icon: (
      <path d="M20 7a8 8 0 0 0-14-2M4 5v4h4M4 17a8 8 0 0 0 14 2M20 19v-4h-4" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    href: "/insurance",
    title: "ביטוח משכנתא",
    desc: "השוואת פרמיות לביטוח חיים ומבנה — וחיסכון על הפוליסה.",
    grad: "from-[#f0a22a] to-[#d07307]",
    dot: "var(--insurance)",
    features: ["השוואת חברות ביטוח", "פרמיה ראשונה, ממוצעת וכוללת", "השוואה מול פוליסה קיימת"],
    icon: (
      <>
        <path d="M12 3 5 6v5c0 4.4 3 8 7 10 4-2 7-5.6 7-10V6l-7-3Z" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
];

export default async function Home() {
  const user = await currentUser();
  const cta = user?.role === "advisor" ? "/advisor" : user?.role === "admin" ? "/admin" : "/new-mortgage";

  return (
    <>
      <AppHeader />

      {/* ── hero ───────────────────────────────────────────────────── */}
      <section
        className="border-b border-rule"
        style={{ background: "radial-gradient(120% 150% at 85% -20%, #eaf0ff 0%, #f6f8fc 55%)" }}
      >
        <div className="mx-auto grid max-w-[1240px] items-center gap-12 px-5 py-16 sm:px-7 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
          <div className="anim-fade">
            <span className="pill border border-rule bg-white text-primary shadow-sm">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-refi" />
              הפלטפורמה החכמה למשכנתאות בישראל
            </span>
            <h1 className="display mt-5 text-5xl font-black leading-[1.05] sm:text-6xl">
              המשכנתא הנכונה,
              <br />
              <span className="text-primary">פשוט לחסוך.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-2">
              משווים תמהילים, מחזור וביטוח משכנתא במקום אחד — ניתוח מבוסס נתונים שחוסך לכם
              עשרות אלפי שקלים, בלי בירוקרטיה מיותרת. מנוע החישוב מאומת מול הסימולטור המקורי.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={cta} className="btn-primary press px-7 py-4 text-base">
                {user ? "המשך לאזור שלך ←" : "בדקו את ההצעות שלכם ←"}
              </Link>
              <Link href="/login" className="px-3 py-4 text-base font-semibold text-primary">
                כניסה לאזור האישי ←
              </Link>
            </div>
            <div className="mt-10 flex gap-8">
              <div>
                <div className="display num text-3xl font-bold">₪127K</div>
                <div className="mt-0.5 text-[13px] font-medium text-ink-3">חיסכון ממוצע לאורך ההלוואה</div>
              </div>
              <div className="w-px bg-rule-strong" />
              <div>
                <div className="display num text-3xl font-bold">5 דק׳</div>
                <div className="mt-0.5 text-[13px] font-medium text-ink-3">לקבלת חמש הצעות תמהיל</div>
              </div>
            </div>
          </div>

          {/* floating illustration card */}
          <div className="relative hidden lg:block">
            <div className="card anim-float rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold">תמהיל מומלץ עבורך</span>
                <span className="pill bg-[#e7f6ef] px-3 py-1.5 text-xs font-bold text-refi">סיכון בינוני</span>
              </div>
              <div className="my-3 flex justify-center">
                <svg width="200" height="116" viewBox="0 0 220 128">
                  <path d="M22 110 A88 88 0 0 1 50 45" stroke="#1F9D6B" strokeWidth="17" fill="none" strokeLinecap="round" />
                  <path d="M62 36 A88 88 0 0 1 158 36" stroke="#E0A100" strokeWidth="17" fill="none" strokeLinecap="round" />
                  <path d="M170 45 A88 88 0 0 1 198 110" stroke="#E04848" strokeWidth="17" fill="none" strokeLinecap="round" />
                  <g transform="rotate(-18 110 110)"><line x1="110" y1="110" x2="110" y2="44" stroke="#0C1838" strokeWidth="5" strokeLinecap="round" /></g>
                  <circle cx="110" cy="110" r="9" fill="#0C1838" /><circle cx="110" cy="110" r="3.5" fill="#fff" />
                </svg>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-paper p-3.5">
                  <div className="text-xs font-medium text-ink-3">החזר חודשי</div>
                  <div className="display num mt-1 text-2xl font-bold">₪6,180</div>
                </div>
                <div className="rounded-2xl bg-paper p-3.5">
                  <div className="text-xs font-medium text-ink-3">חיסכון מול הבנק</div>
                  <div className="display num mt-1 text-2xl font-bold text-refi">₪94,300</div>
                </div>
              </div>
              <div className="mt-3.5 flex gap-1.5">
                <div className="h-2 flex-[1.7] rounded-md bg-primary" />
                <div className="h-2 flex-[1.3] rounded-md bg-[#5c7be6]" />
                <div className="h-2 flex-1 rounded-md bg-[#a9bcf2]" />
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] font-medium text-ink-3">
                <span>קבועה 45%</span><span>משתנה 30%</span><span>פריים 25%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1">
        {/* ── value strip ──────────────────────────────────────────── */}
        <div className="mx-auto grid max-w-[1240px] gap-5 px-5 py-8 sm:grid-cols-3 sm:px-7">
          {[
            { t: "חיסכון בכסף", d: "בחירת תמהיל נכון חוסכת עשרות עד מאות אלפי ש״ח.", bg: "bg-tint", c: "var(--primary)" },
            { t: "חיסכון בזמן", d: "כל המידע מרוכז במקום אחד, בלי פגישות וטלפונים.", bg: "bg-[#e7f6ef]", c: "var(--refi)" },
            { t: "שקיפות מלאה", d: "נתונים, עלויות ורמות סיכון בצורה ברורה וקלה להבנה.", bg: "bg-[#fbf1e2]", c: "var(--insurance)" },
          ].map((v) => (
            <div key={v.t} className="flex items-start gap-3">
              <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${v.bg}`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke={v.c} strokeWidth="1.9" />
                  <path d="M9 12l2 2 4-4" stroke={v.c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <div className="text-base font-bold">{v.t}</div>
                <div className="mt-0.5 text-sm leading-relaxed text-ink-2">{v.d}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── services ─────────────────────────────────────────────── */}
        <div className="mx-auto max-w-[1240px] px-5 pb-20 pt-4 sm:px-7">
          <div className="mb-8 text-center">
            <div className="text-sm font-bold text-primary">השירותים שלנו</div>
            <h2 className="display mt-2 text-4xl font-bold">באיזה שירות נתחיל?</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {SERVICES.map((s) => (
              <Link key={s.href} href={s.href} className="card lift press flex flex-col rounded-3xl p-7">
                <span className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${s.grad} shadow-lg`}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">{s.icon}</svg>
                </span>
                <h3 className="mt-5 text-2xl font-extrabold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{s.desc}</p>
                <div className="my-5 flex flex-col gap-2.5">
                  {s.features.map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-sm text-ink-2">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
                      {f}
                    </div>
                  ))}
                </div>
                <span className={`mt-auto rounded-xl bg-gradient-to-br ${s.grad} py-3 text-center text-sm font-bold text-white`}>
                  התחל עכשיו ←
                </span>
              </Link>
            ))}
          </div>

          <p className="mt-12 text-center text-xs text-ink-3">
            המידע להמחשה בלבד ואינו מהווה ייעוץ משכנתאי או פיננסי מורשה.
          </p>
        </div>
      </main>

      <AppFooter />
    </>
  );
}
