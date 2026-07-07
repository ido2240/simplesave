"use client";

// "המשך עם יועץ" lead capture at the end of the public calculators — turns a
// comparison into a handoff instead of a dead end. Write-only insert into
// public.leads; staff read them on /admin/leads.
import { useActionState } from "react";
import { submitCalculatorLead, type LeadState } from "@/lib/lead-actions";

export default function LeadCaptureCard({
  service,
  context,
  subtitle,
}: {
  service: "refinance" | "insurance";
  context: string;
  subtitle?: string;
}) {
  const [state, formAction, pending] = useActionState<LeadState, FormData>(
    submitCalculatorLead.bind(null, service, context),
    null,
  );
  const field = "w-full rounded-xl border border-rule-strong bg-paper px-4 py-3 outline-none focus:border-primary";

  if (state?.ok) {
    return (
      <div className="card mt-9 rounded-2xl border border-[#bfe8d2] bg-[#e7f6ef] p-6 text-center">
        <p className="text-lg font-bold text-refi">✓ קיבלנו את הפנייה</p>
        <p className="mt-1 text-sm text-[#2f7d57]">יועץ משכנתאות יחזור אליכם בהקדם עם הצעה מותאמת.</p>
      </div>
    );
  }

  return (
    <div className="card mt-9 rounded-2xl p-6">
      <h2 className="display text-2xl font-bold">המשך עם יועץ</h2>
      <p className="mb-4 mt-1 text-sm text-ink-2">
        {subtitle ?? "השאירו פרטים — יועץ משכנתאות יבחן את הנתונים שלכם ויחזור אליכם עם הצעה מותאמת, ללא עלות וללא התחייבות."}
      </p>
      <form action={formAction} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="block">
          <span className="lbl mb-1 block">שם מלא</span>
          <input name="fullName" required minLength={2} className={field} placeholder="ישראל ישראלי" />
        </label>
        <label className="block">
          <span className="lbl mb-1 block">טלפון</span>
          <input name="phone" type="tel" dir="ltr" required className={`${field} text-left`} placeholder="050-1234567" />
        </label>
        <button disabled={pending} className="btn-primary press px-6 py-3 disabled:opacity-50">
          {pending ? "שולח…" : "השאירו פרטים ←"}
        </button>
      </form>
      {state?.error && !pending && <p className="mt-2 text-sm font-semibold text-risk-high" role="alert">{state.error}</p>}
      <p className="mt-3 text-xs text-ink-3">הפרטים ישמשו ליצירת קשר בלבד, בהתאם למדיניות הפרטיות.</p>
    </div>
  );
}
