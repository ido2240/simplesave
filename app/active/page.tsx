import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import TrackDonut, { DONUT_COLORS } from "@/components/TrackDonut";
import { requireRole } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase-server";
import { getActiveRequest } from "@/lib/requests";
import { requirePaid } from "@/lib/billing";
import { shekel } from "@/lib/format";

// Active-mortgage management (mockup screen 12): balances per track, payments
// progress ring, and the refinance-opportunity banner.
export default async function ActiveMortgagePage() {
  const user = await requireRole("client");
  const req = await getActiveRequest(user.id);
  if (!req) {
    return (<><AppHeader /><main className="mx-auto max-w-xl flex-1 px-5 py-20 text-center"><Link href="/new-mortgage" className="btn-primary px-6 py-3">התחל שאלון</Link></main><AppFooter /></>);
  }
  await requirePaid(req.id);

  const db = await supabaseServer();
  const [{ data: am }, { data: tracks }] = await Promise.all([
    db.from("active_mortgages").select("payments_made, payments_total, started_at").eq("request_id", req.id).maybeSingle(),
    db.from("active_tracks").select("id, label, share_pct, balance, rate_label, monthly, years").eq("request_id", req.id).order("share_pct", { ascending: false }),
  ]);

  if (!am) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto w-full max-w-xl flex-1 px-5 py-20 text-center">
          <h1 className="display mb-3 text-3xl font-bold">ניהול משכנתא פעילה</h1>
          <p className="mb-5 text-ink-2">המסך ייפתח לאחר חתימה על המשכנתא — היועץ יזין את פרטי הביצוע.</p>
          <Link href="/personal" className="btn-primary px-6 py-3">לאזור האישי ←</Link>
        </main>
        <AppFooter />
      </>
    );
  }

  const list = tracks ?? [];
  const totalBalance = list.reduce((s, t) => s + t.balance, 0);
  const totalMonthly = list.reduce((s, t) => s + t.monthly, 0);
  const pctPaid = am.payments_total > 0 ? am.payments_made / am.payments_total : 0;
  const C = 2 * Math.PI * 64;

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12 sm:px-7">
        <p className="text-sm font-bold text-primary">המשכנתא שלי</p>
        <h1 className="display mb-6 mt-2 text-4xl font-bold">ניהול משכנתא פעילה</h1>

        {/* refi-opportunity banner (mockup) */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#bfe8d2] bg-[#e7f6ef] p-5">
          <div>
            <p className="font-bold text-[#0e7a50]">הזדמנות למחזור משתלם</p>
            <p className="text-sm text-[#2f7d57]">כשהריבית משתנה, בדיקת מחזור קצרה יכולה לחסוך עשרות אלפי שקלים.</p>
          </div>
          <Link href="/refinance" className="press rounded-xl bg-gradient-to-br from-[#1fb47b] to-[#0e7a50] px-5 py-2.5 text-sm font-bold text-white">
            בדוק כדאיות ←
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* payments progress ring */}
          <div className="card flex flex-col items-center rounded-2xl p-6">
            <h2 className="lbl mb-3 self-start">התקדמות תשלומים</h2>
            <svg width={160} height={160} viewBox="0 0 160 160" role="img" aria-label={`שולמו ${am.payments_made} מתוך ${am.payments_total} תשלומים`}>
              <circle cx={80} cy={80} r={64} stroke="var(--rule)" strokeWidth={13} fill="none" />
              <circle
                cx={80} cy={80} r={64} stroke="var(--primary)" strokeWidth={13} fill="none" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * (1 - pctPaid)} transform="rotate(-90 80 80)"
              />
              <text x={80} y={74} textAnchor="middle" fontSize={30} fontWeight={700} fill="var(--ink)" fontFamily="var(--font-display, serif)">
                {Math.round(pctPaid * 100)}%
              </text>
              <text x={80} y={98} textAnchor="middle" fontSize={13} fill="var(--ink-3)">
                {am.payments_made} / {am.payments_total} תשלומים
              </text>
            </svg>
            {am.started_at && <p className="mt-2 text-xs text-ink-3">תחילת המשכנתא: {new Date(am.started_at).toLocaleDateString("he-IL")}</p>}
          </div>

          {/* composition + totals */}
          <div className="card flex flex-col items-center rounded-2xl p-6">
            <h2 className="lbl mb-3 self-start">הרכב המשכנתא</h2>
            <TrackDonut shares={list.map((t) => t.share_pct)} />
            <div className="mt-2 grid w-full grid-cols-2 gap-3 text-center">
              <div><p className="lbl">יתרה כוללת</p><p className="display num text-lg font-bold">{shekel(totalBalance)}</p></div>
              <div><p className="lbl">החזר חודשי</p><p className="display num text-lg font-bold">{shekel(totalMonthly)}</p></div>
            </div>
          </div>
        </div>

        {/* per-track rows */}
        <div className="card mt-4 overflow-hidden rounded-2xl">
          <ul className="divide-y divide-rule">
            {list.map((t, i) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <span className="flex items-center gap-2.5 font-bold">
                  <span className="h-3 w-3 rounded-[4px]" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  {t.label}
                  <span className="lbl">{t.share_pct}%</span>
                </span>
                <span className="num flex flex-wrap gap-4 text-sm text-ink-2">
                  <span>יתרה {shekel(t.balance)}</span>
                  <span>ריבית {t.rate_label}</span>
                  <span>{shekel(t.monthly)}/חודש</span>
                  <span>{t.years} שנים</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8">
          <Link href="/personal" className="btn-ghost press px-5 py-2.5 text-sm">→ לאזור האישי</Link>
        </div>
      </main>
      <AppFooter />
    </>
  );
}
