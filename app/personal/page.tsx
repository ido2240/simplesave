import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import DashHeader, { DashStat } from "@/components/DashHeader";
import { requireRole } from "@/lib/session";
import { getActiveRequest } from "@/lib/requests";
import { computeOneClock } from "@/lib/engine-config";
import { listSecurities } from "@/lib/securities";
import { shekel } from "@/lib/format";

export default async function PersonalPage({ searchParams }: { searchParams: Promise<{ paid?: string }> }) {
  const user = await requireRole("client");
  const { paid: justPaid } = await searchParams;
  const req = await getActiveRequest(user.id);
  const d = req?.details;
  const isPaid = req?.service_status === "PAID";

  let chosen = null;
  if (req?.chosen_clock_id && d && d.loan_amount > 0) {
    chosen = await computeOneClock(req.chosen_clock_id, d.loan_amount, d.min_pay, d.max_pay);
  }
  const securities = req?.id ? await listSecurities(req.id) : [];

  return (
    <>
      <AppHeader />
      <DashHeader eyebrow="האזור האישי" title={`שלום, ${user.name} 👋`}>
        <DashStat label="בקשות פעילות" value={req ? 1 : 0} />
        {chosen && <DashStat label="החזר חודשי" value={shekel(chosen.mix.firstPay)} accent="#7DE6B4" />}
      </DashHeader>

      <main className="mx-auto w-full max-w-[1100px] flex-1 px-5 py-8 sm:px-7">
        {justPaid === "1" && isPaid && (
          <div className="mb-6 rounded-2xl border border-[#bfe8d2] bg-[#e7f6ef] p-5">
            <p className="font-bold text-refi">✓ התשלום התקבל — השירות המלא פעיל!</p>
            <p className="mt-0.5 text-sm text-[#2f7d57]">השלב הבא: חתימה על כתבי ההרשאה מול הבנקים.</p>
          </div>
        )}
        {!d ? (
          <div className="card rounded-2xl p-8 text-center">
            <p className="mb-5 text-ink-2">עוד לא מילאת שאלון משכנתא.</p>
            <Link href="/new-mortgage" className="btn-primary px-6 py-3">התחל שאלון</Link>
          </div>
        ) : chosen ? (
          <div
            className="rounded-2xl border border-[#d9e2f7] p-6"
            style={{ background: "linear-gradient(120deg,#eef3ff,#f5f8fe)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-extrabold">התמהיל שבחרת · {chosen.nameHe}</span>
              <Link href={`/new-mortgage/clock/${chosen.key}`} className="text-sm font-semibold text-primary underline">פירוט</Link>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-4">
              <StatTile label="החזר ראשון" value={shekel(chosen.mix.firstPay)} accent="var(--primary)" />
              <StatTile label="עלות כוללת" value={shekel(chosen.mix.total)} />
              <StatTile label="רמת סיכון" value={chosen.risk.label} />
            </div>
          </div>
        ) : (
          <div className="card rounded-2xl p-6">
            <p className="mb-4 text-ink-2">עדיין לא בחרת תמהיל.</p>
            <Link href="/new-mortgage/clocks" className="btn-primary px-6 py-3">בחר תמהיל ←</Link>
          </div>
        )}

        {d && req && !isPaid && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#f0debe] bg-[#fbf1e2] p-5">
            <div>
              <p className="font-bold text-[#8a5208]">שדרגו לשירות המלא</p>
              <p className="text-sm text-[#9a6a22]">כתבי הרשאה, מסמכים וליווי יועץ — בתשלום חד-פעמי.</p>
            </div>
            <Link
              href="/checkout"
              className="press rounded-xl bg-gradient-to-br from-[#f0a22a] to-[#d07307] px-5 py-2.5 text-sm font-bold text-white"
            >
              שדרג ←
            </Link>
          </div>
        )}

        {d && req && isPaid && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#bfe8d2] bg-[#f2faf6] p-5">
            <div>
              <p className="font-bold text-[#1f6b46]">השירות המלא פעיל</p>
              <p className="text-sm text-[#2f7d57]">המשיכו בתהליך: חתימת כתבי הרשאה ולאחריה העלאת מסמכים.</p>
            </div>
            <Link href="/authorizations" className="btn-primary press px-5 py-2.5 text-sm">המשך לכתבי הרשאה ←</Link>
          </div>
        )}

        {securities.length > 0 && (
          <div className="card mt-6 rounded-2xl p-6">
            <h2 className="display mb-3 text-xl font-bold">בטחונות</h2>
            <ul className="divide-y divide-rule">
              {securities.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2.5">
                  <p className="font-bold">{s.description}</p>
                  <span className="lbl">{s.kind}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <NextStep href="/new-mortgage/clocks" title="התמהילים" desc="חמשת השעונים שלך" />
          <NextStep href="/authorizations" title="כתבי הרשאה" desc="חתימה מול הבנקים" />
          <NextStep href="/documents" title="מסמכים" desc="העלאת מסמכים נדרשים" />
        </div>
      </main>
      <AppFooter />
    </>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center">
      <p className="text-[13px] text-ink-3">{label}</p>
      <p className="display num mt-1 text-xl font-bold sm:text-2xl" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
    </div>
  );
}

function NextStep({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="card lift press rounded-2xl p-5">
      <p className="font-bold">{title}</p>
      <p className="mt-0.5 text-sm text-ink-3">{desc}</p>
    </Link>
  );
}
