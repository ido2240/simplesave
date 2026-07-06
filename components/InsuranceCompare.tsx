"use client";

// Insurance comparison (mockup screen 9), owner-approved 2026-07-06 with the
// hard condition that the mockup's premium factors are labeled DEMO/estimated
// tariffs everywhere — they are NOT live insurer quotes.
import { useState } from "react";

const N_MONTHS = 300;
const AVG_FACTOR = 0.63; // declining-balance average vs first-year premium

// Mockup factors — illustrative estimates approved as demo tariffs only.
const INSURERS = [
  { name: "הראל", short: "הר", rating: 4.6, factor: 0.000395, color: "#2549C9" },
  { name: "הפניקס", short: "הפ", rating: 4.5, factor: 0.000412, color: "#7A4FE0" },
  { name: "מנורה מבטחים", short: "מנ", rating: 4.4, factor: 0.000428, color: "#1FA0A0" },
  { name: "מגדל", short: "מג", rating: 4.3, factor: 0.000447, color: "#D9820B" },
  { name: "כלל ביטוח", short: "כל", rating: 4.1, factor: 0.000465, color: "#C24C8E" },
];

const fmt = (n: number) => `${Math.round(n).toLocaleString("he-IL")} ₪`;

function Spark({ first, color }: { first: number; color: string }) {
  const W = 88, H = 34, n = 12;
  const pts = Array.from({ length: n }, (_, i) => first * (1 - 0.62 * (i / (n - 1))));
  const mx = first, mn = first * 0.34;
  const X = (i: number) => 2 + (W - 4) * (i / (n - 1));
  const Y = (v: number) => 3 + (H - 6) * (1 - (v - mn) / (mx - mn));
  const d = pts.map((v, i) => `${i ? "L" : "M"} ${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden className="shrink-0">
      <path d={`${d} L ${X(n - 1).toFixed(1)} ${H - 2} L ${X(0).toFixed(1)} ${H - 2} Z`} fill={color} opacity={0.1} />
      <path d={d} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={X(0)} cy={Y(pts[0])} r={2.4} fill={color} />
      <circle cx={X(n - 1)} cy={Y(pts[n - 1])} r={2.4} fill={color} />
    </svg>
  );
}

export default function InsuranceCompare({ defaultSum }: { defaultSum: number }) {
  const [sum, setSum] = useState(defaultSum);
  const [existing, setExisting] = useState(0);

  const rows = INSURERS
    .map((c) => {
      const first = sum * c.factor;
      const avg = first * AVG_FACTOR;
      return { ...c, first, avg, total: avg * N_MONTHS };
    })
    .sort((a, b) => a.total - b.total);

  const field = "num w-full rounded-xl border border-rule-strong bg-paper px-3.5 py-2.5 outline-none focus:border-insurance";

  return (
    <div>
      <div className="mb-5 rounded-xl border border-[#f0debe] bg-[#fbf1e2] px-4 py-3 text-sm font-semibold text-[#8a5208]">
        ⚠️ תעריפי הדגמה משוערים בלבד — אלה אינן הצעות מחיר של חברות הביטוח. הצעה מחייבת מתקבלת רק מהמבטח.
      </div>

      <div className="card mb-6 grid grid-cols-1 gap-5 rounded-2xl p-6 sm:grid-cols-2">
        <label className="block"><span className="lbl mb-1 block">יתרת המשכנתא לביטוח (₪)</span>
          <input type="number" value={sum} onChange={(e) => setSum(Number(e.target.value) || 0)} className={field} /></label>
        <label className="block"><span className="lbl mb-1 block">פרמיה חודשית בפוליסה קיימת (₪, לא חובה)</span>
          <input type="number" value={existing || ""} placeholder="להשוואה מול פוליסה קיימת" onChange={(e) => setExisting(Number(e.target.value) || 0)} className={field} /></label>
      </div>

      <ul className="space-y-3">
        {rows.map((c, i) => {
          const monthlySave = existing > 0 ? existing - c.first : 0;
          return (
            <li
              key={c.name}
              className={`grid grid-cols-2 items-center gap-x-4 gap-y-2 rounded-2xl px-5 py-4 sm:grid-cols-[1.4fr_1fr_1fr_1fr_auto] ${
                i === 0 ? "border-2 border-insurance bg-[#fffbf3]" : "card"
              }`}
            >
              <div className="col-span-2 flex items-center gap-3 sm:col-span-1">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl text-[15px] font-extrabold text-white" style={{ background: c.color }}>
                  {c.short}
                </span>
                <div>
                  <p className="font-bold">
                    {c.name}
                    {i === 0 && <span className="mr-2 rounded-full bg-insurance px-2 py-0.5 text-[10.5px] font-extrabold text-white">הזולה ביותר</span>}
                  </p>
                  <p className="text-xs text-ink-3" title="דירוג שביעות רצון (מדד האוצר)">
                    <span className="text-[#d9820b]">{"★★★★★".slice(0, Math.round(c.rating))}</span>
                    <span className="num mr-1">{c.rating.toFixed(1)}</span> · דירוג האוצר
                  </p>
                </div>
              </div>
              <div><p className="lbl">פרמיה ראשונה*</p><p className="num font-bold">{fmt(c.first)}</p></div>
              <div><p className="lbl">פרמיה ממוצעת*</p><p className="num font-bold">{fmt(c.avg)}</p></div>
              <div><p className="lbl">סה״כ משוער*</p><p className="num font-bold">{fmt(c.total)}</p></div>
              <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:justify-end">
                <Spark first={c.first} color={c.color} />
                {existing > 0 && (
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${monthlySave >= 0 ? "bg-[#e7f6ef] text-[#0e7a50]" : "bg-[#fceeec] text-risk-high"}`}>
                    {monthlySave >= 0 ? `חיסכון ${fmt(monthlySave)}/ח׳` : `יקר ב-${fmt(-monthlySave)}/ח׳`}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-xs text-ink-3">
        * תעריפי הדגמה: פרמיה ראשונה = יתרה × מקדם הדגמה; ממוצעת = 63% מהראשונה (יתרה יורדת); סה״כ לאורך {N_MONTHS / 12} שנים.
        המספרים להמחשה בלבד ואינם תלויים בגיל, מצב בריאותי או מסלול — הצעה אמיתית תתקבל מחברת הביטוח.
      </p>
    </div>
  );
}
