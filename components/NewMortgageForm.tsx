"use client";

import { useActionState, useState } from "react";
import { saveNewMortgage } from "@/app/new-mortgage/actions";
import { pmt } from "@/lib/engine";
import {
  TARGET_PRICE_MIN_EQUITY,
  computeLoanAmountNew,
  financingLimitPct,
  minEquityPct,
  type LoanType,
  type PropertySource,
} from "@/lib/engine/rules";

const field = "num w-full rounded-xl border border-rule-strong bg-paper px-3.5 py-2.5 outline-none focus:border-primary";

export interface BorrowerSeed {
  fullName: string;
  birthDate: string;
  netIncome: number;
  isOwner: boolean;
}

export interface FormDefaults {
  propertyValue: number;
  equity: number;
  loanType: string;
  propertySource: string;
  termYears: number;
  minPay: number;
  maxPay: number;
  additionalIncome: number;
  fixedExpenses: number;
}

const emptyBorrower: BorrowerSeed = { fullName: "", birthDate: "1985-05-05", netIncome: 30000, isOwner: true };

const shekelFmt = (n: number) => `${Math.round(n).toLocaleString("he-IL")} ₪`;

export default function NewMortgageForm({
  defaults,
  borrowers,
  paymentRatio,
  fixedRate,
}: {
  defaults: FormDefaults;
  borrowers: BorrowerSeed[];
  paymentRatio: number;
  /** Live fixed-rate anchor — used for the minimum-payment floor hint. */
  fixedRate: number;
}) {
  const [state, formAction, pending] = useActionState(saveNewMortgage, undefined);
  const [rows, setRows] = useState<BorrowerSeed[]>(borrowers.length ? borrowers : [{ ...emptyBorrower }]);
  const [additionalIncome, setAdditionalIncome] = useState(defaults.additionalIncome);
  const [fixedExpenses, setFixedExpenses] = useState(defaults.fixedExpenses);
  const [maxPay, setMaxPay] = useState(defaults.maxPay);
  const [propertyValue, setPropertyValue] = useState(defaults.propertyValue);
  const [equity, setEquity] = useState(defaults.equity);
  const [loanType, setLoanType] = useState(defaults.loanType as LoanType);
  const [propertySource, setPropertySource] = useState(defaults.propertySource as PropertySource);

  // Live LTV/equity hints — same pure engine functions the server validates with.
  const ltv = financingLimitPct(loanType, propertySource);
  const minEqPct = minEquityPct(loanType, propertySource);
  const requiredEquity = Math.max(
    propertyValue * minEqPct,
    propertySource === "target_price" ? TARGET_PRICE_MIN_EQUITY : 0,
  );
  const equityOk = equity >= requiredEquity - 0.01;
  const estLoan = computeLoanAmountNew({
    loanType, propertySource, propertyValue, equity,
    borrowers: [], additionalIncome: 0, fixedExpenses: 0,
    desiredMinPayment: 0, desiredMaxPayment: 0, existingMortgageBalance: 0,
  });

  // Mirrors the server rule (lib/engine/rules): non-owner income counts at 50%.
  const countingIncome = rows.reduce((s, r) => s + (r.isOwner ? r.netIncome : r.netIncome * 0.5), 0);
  const capacity = Math.max(0, (countingIncome + additionalIncome - fixedExpenses) * paymentRatio);
  const overCapacity = maxPay > capacity + 0.01;

  // Payment floor for this loan: full 30-year spread at the live fixed anchor.
  // Tells the user the minimum monthly payment the requested amount requires —
  // and whether the loan is feasible at all given their capacity.
  const MAX_TERM_YEARS = 30;
  const minRequiredPay = estLoan > 0 ? -pmt(fixedRate / 12, MAX_TERM_YEARS * 12, estLoan) : 0; // pmt is sign-negative (Excel convention)
  const loanInfeasible = minRequiredPay > capacity + 0.01;
  const maxPayBelowFloor = !loanInfeasible && minRequiredPay > 0 && maxPay < minRequiredPay - 0.01;

  const setRow = (i: number, patch: Partial<BorrowerSeed>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => (rs.length >= 5 ? rs : [...rs, { ...emptyBorrower, fullName: "" }]));
  const removeRow = (i: number) => setRows((rs) => (rs.length <= 1 ? rs : rs.filter((_, j) => j !== i)));

  return (
    <form action={formAction} className="space-y-8">
      {state?.issues?.length ? (
        <div className="rounded-xl border border-risk-high bg-[#fceeec] p-4">
          <p className="mb-1 font-bold text-risk-high">יש לתקן את הפרטים הבאים:</p>
          <ul className="list-disc space-y-0.5 pr-5 text-sm text-risk-high">
            {state.issues.map((iss, i) => (
              <li key={i}>{iss.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <section className="card grid grid-cols-1 gap-5 rounded-2xl p-6 sm:grid-cols-2">
        <label className="block"><span className="lbl mb-1 block">שווי הנכס (₪)</span>
          <input name="propertyValue" type="number" value={propertyValue} onChange={(e) => setPropertyValue(Number(e.target.value) || 0)} className={field} /></label>
        <label className="block"><span className="lbl mb-1 block">הון עצמי (₪)</span>
          <input name="equity" type="number" value={equity} onChange={(e) => setEquity(Number(e.target.value) || 0)} className={field} /></label>
        <div className="sm:col-span-2 rounded-xl bg-[#eff3ff] px-4 py-3 text-sm font-semibold text-[#2a47a8]">
          אחוז מימון מרבי: <b className="num">{Math.round(ltv * 100)}%</b> · מימון מקסימלי <b className="num">{shekelFmt(propertyValue * ltv)}</b> · סכום משכנתא משוער: <b className="num">{shekelFmt(estLoan)}</b>
        </div>
        <div className={`sm:col-span-2 rounded-xl px-4 py-3 text-sm font-semibold ${equityOk ? "bg-[#e9f7f0] text-[#0e7a50]" : "bg-[#fceeec] text-risk-high"}`}>
          {equityOk
            ? <>מצוין — הון עצמי תקין. סכום משכנתא: <b className="num">{shekelFmt(estLoan)}</b></>
            : <>נדרש הון עצמי של לפחות <b className="num">{shekelFmt(requiredEquity)}</b> ({Math.round(minEqPct * 100)}% משווי הנכס{propertySource === "target_price" ? ", מינ׳ 100,000 ₪" : ""})</>}
        </div>
        <label className="block"><span className="lbl mb-1 block">סוג הלוואה</span>
          <select name="loanType" value={loanType} onChange={(e) => setLoanType(e.target.value as LoanType)} className={field}>
            <option value="single_property">נכס יחיד · עד 75% מימון</option>
            <option value="additional_property">נכס נוסף · עד 50% מימון</option>
            <option value="all_purpose">לכל מטרה · עד 50% מימון</option>
            <option value="improvement">שיפור דיור · עד 70% מימון</option>
          </select></label>
        <label className="block"><span className="lbl mb-1 block">מקור הנכס</span>
          <select name="propertySource" value={propertySource} onChange={(e) => setPropertySource(e.target.value as PropertySource)} className={field}>
            <option value="second_hand">יד 2 · עד 75%</option>
            <option value="contractor">קבלן · עד 75%</option>
            <option value="target_price">מחיר למשתכן · עד 90%, מינ׳ 100,000 ₪ הון עצמי</option>
            <option value="self_build">בנייה עצמית</option>
          </select></label>
        <label className="block"><span className="lbl mb-1 block">תקופה (שנים)</span>
          <input name="termYears" type="number" min={4} max={30} defaultValue={defaults.termYears} className={field} /></label>
      </section>

      <section className="card rounded-2xl p-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="lbl">לווים</p>
          <button type="button" onClick={addRow} disabled={rows.length >= 5}
            className="btn-ghost press px-3.5 py-1.5 text-sm disabled:opacity-40">+ הוסף לווה</button>
        </div>
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-1 gap-3 rounded-xl border border-rule bg-paper p-3.5 sm:grid-cols-12">
              <label className="block sm:col-span-4"><span className="lbl mb-1 block">שם מלא · לווה {i + 1}</span>
                <input name="bFullName" value={r.fullName} onChange={(e) => setRow(i, { fullName: e.target.value })} className={field} /></label>
              <label className="block sm:col-span-3"><span className="lbl mb-1 block">תאריך לידה</span>
                <input name="bBirthDate" type="date" dir="ltr" value={r.birthDate} onChange={(e) => setRow(i, { birthDate: e.target.value })} className={field} /></label>
              <label className="block sm:col-span-3"><span className="lbl mb-1 block">הכנסה נטו (₪)</span>
                <input name="bNetIncome" type="number" value={r.netIncome} onChange={(e) => setRow(i, { netIncome: Number(e.target.value) })} className={field} /></label>
              <label className="block sm:col-span-2"><span className="lbl mb-1 block">בעל נכס</span>
                <select name="bIsOwner" value={r.isOwner ? "1" : "0"} onChange={(e) => setRow(i, { isOwner: e.target.value === "1" })} className={field}>
                  <option value="1">כן</option>
                  <option value="0">לא</option>
                </select></label>
              {rows.length > 1 && (
                <div className="sm:col-span-12">
                  <button type="button" onClick={() => removeRow(i)} className="text-sm font-semibold text-risk-high hover:underline">הסר לווה</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="card grid grid-cols-1 gap-5 rounded-2xl p-6 sm:grid-cols-2">
        <label className="block"><span className="lbl mb-1 block">הכנסות נוספות (₪)</span>
          <input name="additionalIncome" type="number" value={additionalIncome} onChange={(e) => setAdditionalIncome(Number(e.target.value) || 0)} className={field} /></label>
        <label className="block"><span className="lbl mb-1 block">הוצאות קבועות / הלוואות (₪)</span>
          <input name="fixedExpenses" type="number" value={fixedExpenses} onChange={(e) => setFixedExpenses(Number(e.target.value) || 0)} className={field} /></label>
        <label className="block"><span className="lbl mb-1 block">החזר חודשי רצוי — מ- (₪)</span>
          <input name="minPay" type="number" defaultValue={defaults.minPay} className={field} /></label>
        <label className="block"><span className="lbl mb-1 block">עד- (₪)</span>
          <input name="maxPay" type="number" value={maxPay} onChange={(e) => setMaxPay(Number(e.target.value) || 0)} className={field} /></label>
        <div className={`sm:col-span-2 rounded-xl px-4 py-3 text-sm ${overCapacity || loanInfeasible || maxPayBelowFloor ? "bg-[#fceeec] text-risk-high" : "bg-paper-2 text-ink-2"}`}>
          כושר החזר משוער לפי ההכנסות: <b className="num">{shekelFmt(capacity)}</b> בחודש
          ({Math.round(paymentRatio * 100)}% מההכנסה נטו).
          {minRequiredPay > 0 && (
            <>
              {" "}ההחזר החודשי המינימלי למשכנתא בסך <b className="num">{shekelFmt(estLoan)}</b>:{" "}
              כ-<b className="num">{shekelFmt(minRequiredPay)}</b> (פריסה מלאה ל-{MAX_TERM_YEARS} שנה בריבית קבועה).
            </>
          )}
          {loanInfeasible && (
            <b className="mt-1 block">
              גם בפריסה המלאה ההחזר המינימלי גבוה מכושר ההחזר — הגדילו הון עצמי, צרפו לווה נוסף או עדכנו את ההכנסות.
            </b>
          )}
          {maxPayBelowFloor && (
            <b className="mt-1 block">
              ההחזר המקסימלי שבחרתם נמוך מההחזר המינימלי הנדרש — העלו את &quot;עד&quot; לפחות ל-{shekelFmt(minRequiredPay)}.
            </b>
          )}
          {overCapacity && !loanInfeasible && <b className="mt-1 block">ההחזר המקסימלי שבחרתם גבוה מכושר ההחזר — הקטינו את ההחזר הרצוי או עדכנו את ההכנסות.</b>}
        </div>
      </section>

      <button disabled={pending} className="btn-primary press w-full py-3.5 text-base disabled:opacity-50">
        {pending ? "מחשב…" : "חשב חמישה תמהילים ←"}
      </button>
    </form>
  );
}
