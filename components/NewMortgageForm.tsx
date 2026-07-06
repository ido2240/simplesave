"use client";

import { useActionState, useState } from "react";
import { saveNewMortgage } from "@/app/new-mortgage/actions";

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
}: {
  defaults: FormDefaults;
  borrowers: BorrowerSeed[];
  paymentRatio: number;
}) {
  const [state, formAction, pending] = useActionState(saveNewMortgage, undefined);
  const [rows, setRows] = useState<BorrowerSeed[]>(borrowers.length ? borrowers : [{ ...emptyBorrower }]);
  const [additionalIncome, setAdditionalIncome] = useState(defaults.additionalIncome);
  const [fixedExpenses, setFixedExpenses] = useState(defaults.fixedExpenses);
  const [maxPay, setMaxPay] = useState(defaults.maxPay);

  // Mirrors the server rule (lib/engine/rules): non-owner income counts at 50%.
  const countingIncome = rows.reduce((s, r) => s + (r.isOwner ? r.netIncome : r.netIncome * 0.5), 0);
  const capacity = Math.max(0, (countingIncome + additionalIncome - fixedExpenses) * paymentRatio);
  const overCapacity = maxPay > capacity + 0.01;

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
          <input name="propertyValue" type="number" defaultValue={defaults.propertyValue} className={field} /></label>
        <label className="block"><span className="lbl mb-1 block">הון עצמי (₪)</span>
          <input name="equity" type="number" defaultValue={defaults.equity} className={field} /></label>
        <label className="block"><span className="lbl mb-1 block">סוג הלוואה</span>
          <select name="loanType" defaultValue={defaults.loanType} className={field}>
            <option value="single_property">נכס יחיד</option>
            <option value="additional_property">נכס נוסף</option>
            <option value="all_purpose">לכל מטרה</option>
            <option value="improvement">שיפור דיור</option>
          </select></label>
        <label className="block"><span className="lbl mb-1 block">מקור הנכס</span>
          <select name="propertySource" defaultValue={defaults.propertySource} className={field}>
            <option value="second_hand">יד 2</option>
            <option value="contractor">קבלן</option>
            <option value="target_price">מחיר למשתכן</option>
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
        <div className={`sm:col-span-2 rounded-xl px-4 py-3 text-sm ${overCapacity ? "bg-[#fceeec] text-risk-high" : "bg-paper-2 text-ink-2"}`}>
          כושר החזר משוער לפי ההכנסות: <b className="num">{shekelFmt(capacity)}</b> בחודש
          ({Math.round(paymentRatio * 100)}% מההכנסה נטו).
          {overCapacity && <> ההחזר המקסימלי שבחרתם גבוה מכושר ההחזר — הקטינו את ההחזר הרצוי או עדכנו את ההכנסות.</>}
        </div>
      </section>

      <button disabled={pending} className="btn-primary press w-full py-3.5 text-base disabled:opacity-50">
        {pending ? "מחשב…" : "חשב חמישה תמהילים ←"}
      </button>
    </form>
  );
}
