"use client";

// Refinance existing-mortgage editor (mockup 3c): bank select + up to 10
// per-track rows (balance / rate type / rate / end date / linked). The rows
// aggregate to the server comparison's contract (balance, weighted rate,
// weighted remaining years, indexed) as hidden GET params — the comparison
// itself stays on the validated engine.
import { useMemo, useState } from "react";

export interface RefiTrack {
  balance: string;
  rateType: "fixed" | "variable" | "prime";
  rate: string;
  endDate: string; // yyyy-mm
  linked: boolean;
}

const BANKS = ["בנק הפועלים", "בנק לאומי", "בנק מזרחי-טפחות", "בנק דיסקונט", "הבנק הבינלאומי", "בנק ירושלים", "אחר"];
const RATE_TYPE_LABEL = { fixed: "קבועה", variable: "משתנה", prime: "פריים" } as const;
const MAX_TRACKS = 10;

const field = "num w-full rounded-xl border border-rule-strong bg-paper px-3 py-2 text-sm outline-none focus:border-refi";
const fmt = (n: number) => `${Math.round(n).toLocaleString("he-IL")} ₪`;

function monthsLeft(endDate: string, now: Date): number {
  const m = endDate.match(/^(\d{4})-(\d{1,2})$/);
  if (!m) return 0;
  return Math.max(12, (Number(m[1]) - now.getFullYear()) * 12 + (Number(m[2]) - (now.getMonth() + 1)));
}

export default function RefiTracksForm({
  defaults,
  goals,
  initialGoal,
  initialMin,
  initialMax,
}: {
  defaults: RefiTrack[];
  goals: { value: string; label: string }[];
  initialGoal: string;
  initialMin: number;
  initialMax: number;
}) {
  const [bank, setBank] = useState("");
  const [tracks, setTracks] = useState<RefiTrack[]>(defaults);
  const now = useMemo(() => new Date(), []);

  const setTrack = (i: number, patch: Partial<RefiTrack>) =>
    setTracks((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const addTrack = () =>
    setTracks((ts) => (ts.length >= MAX_TRACKS ? ts : [...ts, { balance: "", rateType: "fixed", rate: "", endDate: "", linked: false }]));
  const removeTrack = (i: number) =>
    setTracks((ts) => (ts.length <= 1 ? ts : ts.filter((_, j) => j !== i)));

  // Aggregate: total balance, balance-weighted rate and remaining term.
  const agg = useMemo(() => {
    let bal = 0, wRate = 0, wMonths = 0, anyLinked = false;
    for (const t of tracks) {
      const b = parseFloat(t.balance) || 0;
      if (b <= 0) continue;
      const r = parseFloat(t.rate) || (t.rateType === "prime" ? 5.6 : 4.8);
      const mo = monthsLeft(t.endDate, now) || 228;
      bal += b; wRate += r * b; wMonths += mo * b;
      if (t.linked) anyLinked = true;
    }
    return {
      balance: Math.round(bal),
      rate: bal > 0 ? wRate / bal : 0,
      years: bal > 0 ? Math.max(1, Math.round(wMonths / bal / 12)) : 0,
      anyLinked,
    };
  }, [tracks, now]);

  const valid = agg.balance > 0 && agg.years > 0 && agg.rate > 0;

  return (
    <form method="get" className="card rounded-2xl p-6">
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="block"><span className="lbl mb-1 block">הבנק הנוכחי</span>
          <select value={bank} onChange={(e) => setBank(e.target.value)} className={field}>
            <option value="">בחרו בנק…</option>
            {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select></label>
        <label className="block"><span className="lbl mb-1 block">מטרת המחזור</span>
          <select name="goal" defaultValue={initialGoal} className={field}>
            {goals.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select></label>
        <div className="rounded-xl bg-paper-2 px-3.5 py-2.5 text-sm">
          <span className="lbl block">סיכום המשכנתא הקיימת</span>
          <span className="num font-bold">{fmt(agg.balance)}</span>
          <span className="num text-ink-3"> · ריבית משוקללת {agg.rate ? agg.rate.toFixed(2) : "—"}% · ~{agg.years || "—"} שנים</span>
        </div>
      </div>

      <p className="lbl mb-2">מסלולי המשכנתא הקיימת ({tracks.length}/{MAX_TRACKS})</p>
      <div className="space-y-2.5">
        {tracks.map((t, i) => (
          <div key={i} className="grid grid-cols-2 items-end gap-2.5 rounded-xl border border-rule bg-paper p-3 sm:grid-cols-[1.2fr_1fr_0.8fr_1fr_auto_auto]">
            <label className="block"><span className="lbl mb-1 block">יתרה (₪)</span>
              <input type="number" value={t.balance} onChange={(e) => setTrack(i, { balance: e.target.value })} className={field} placeholder="650,000" /></label>
            <label className="block"><span className="lbl mb-1 block">סוג ריבית</span>
              <select value={t.rateType} onChange={(e) => setTrack(i, { rateType: e.target.value as RefiTrack["rateType"] })} className={field}>
                {Object.entries(RATE_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></label>
            <label className="block"><span className="lbl mb-1 block">ריבית (%)</span>
              <input type="number" step="0.01" value={t.rate} onChange={(e) => setTrack(i, { rate: e.target.value })} className={field} placeholder="4.9" /></label>
            <label className="block"><span className="lbl mb-1 block">תאריך סיום</span>
              <input type="month" dir="ltr" value={t.endDate} onChange={(e) => setTrack(i, { endDate: e.target.value })} className={field} /></label>
            <label className="flex items-center gap-1.5 pb-2 text-xs font-semibold text-ink-2">
              <input type="checkbox" checked={t.linked} onChange={(e) => setTrack(i, { linked: e.target.checked })} className="accent-[var(--refi,#15976A)]" /> צמוד מדד
            </label>
            <button type="button" onClick={() => removeTrack(i)} disabled={tracks.length <= 1}
              className="pb-1.5 text-sm font-semibold text-risk-high hover:underline disabled:opacity-30" aria-label={`הסר מסלול ${i + 1}`}>
              הסר
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={addTrack} disabled={tracks.length >= MAX_TRACKS}
        className="btn-ghost press mt-3 px-4 py-2 text-sm disabled:opacity-40">+ הוסף מסלול</button>

      <div className="mt-5 grid grid-cols-1 gap-4 border-t border-rule pt-5 sm:grid-cols-3">
        <label className="block"><span className="lbl mb-1 block">החזר רצוי מ- (₪)</span>
          <input name="min" type="number" defaultValue={initialMin} className={field} /></label>
        <label className="block"><span className="lbl mb-1 block">עד- (₪)</span>
          <input name="max" type="number" defaultValue={initialMax} className={field} /></label>
        <div className="self-end">
          {/* aggregated contract for the server-side engine comparison */}
          <input type="hidden" name="balance" value={agg.balance} />
          <input type="hidden" name="years" value={agg.years} />
          <input type="hidden" name="rate" value={agg.rate ? agg.rate.toFixed(2) : ""} />
          <input type="hidden" name="indexed" value={agg.anyLinked ? "1" : "0"} />
          <button disabled={!valid}
            className="press w-full rounded-xl bg-gradient-to-br from-[#1fb47b] to-[#0e7a50] py-3 font-bold text-white shadow-[0_12px_24px_-8px_rgba(21,151,106,0.4)] disabled:cursor-not-allowed disabled:opacity-50">
            חשב והשווה ←
          </button>
        </div>
      </div>
      {!valid && <p className="mt-2 text-xs text-ink-3">הזינו לפחות מסלול אחד עם יתרה, ריבית ותאריך סיום.</p>}
    </form>
  );
}
