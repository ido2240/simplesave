"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { registerUser } from "./actions";

const inputCls = "w-full rounded-xl border border-rule-strong bg-paper px-4 py-3 outline-none focus:border-primary";

export default function RegisterPage() {
  const [error, formAction, pending] = useActionState(registerUser, undefined);
  // Live hints while typing — the #1 signup complaint was an opaque failure
  // with no clue whether the password was too short or mismatched.
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const longEnough = password.length >= 8;
  const match = confirm.length > 0 && password === confirm;
  const mismatch = confirm.length > 0 && password !== confirm;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="card anim-fade w-full max-w-md rounded-3xl p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-2 to-primary-deep shadow-[0_6px_16px_-4px_rgba(37,73,201,0.5)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M4 13.5 12 6l8 7.5" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <div className="display text-xl font-extrabold">SimpleSave</div>
            <div className="text-[11px] font-medium text-ink-3">פשוט לחסוך</div>
          </div>
        </div>
        <h1 className="display mb-1 mt-6 text-3xl font-bold">הרשמה</h1>
        <p className="mb-6 text-sm text-ink-2">פתחו חשבון כדי לקבל חמישה תמהילים ולנהל את התהליך.</p>

        <form action={formAction} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">שם מלא</span>
            <input name="fullName" type="text" required className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">אימייל</span>
            <input name="email" type="email" required dir="ltr" placeholder="you@example.com" className={`${inputCls} text-left`} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">סיסמה</span>
            <input
              name="password" type="password" required dir="ltr" minLength={8}
              value={password} onChange={(e) => setPassword(e.target.value)}
              className={`${inputCls} text-left`}
            />
            <span className={`mt-1 block text-xs font-semibold ${password.length === 0 ? "text-ink-3" : longEnough ? "text-risk-low" : "text-risk-high"}`}>
              {password.length === 0 ? "לפחות 8 תווים — אין דרישה לאות גדולה או לתו מיוחד." : longEnough ? "✓ אורך הסיסמה תקין" : `✗ חסרים עוד ${8 - password.length} תווים (נדרשים לפחות 8)`}
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">אימות סיסמה</span>
            <input
              name="confirm" type="password" required dir="ltr"
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className={`${inputCls} text-left ${mismatch ? "border-risk-high" : ""}`}
              aria-invalid={mismatch}
            />
            {mismatch && <span className="mt-1 block text-xs font-semibold text-risk-high">✗ הסיסמאות אינן תואמות — יש להקליד את אותה סיסמה בשני השדות.</span>}
            {match && <span className="mt-1 block text-xs font-semibold text-risk-low">✓ הסיסמאות תואמות</span>}
          </label>
          <label className="flex items-start gap-2.5 text-[13px] text-ink-2">
            <input type="checkbox" name="consent" required className="mt-0.5 accent-[var(--primary)]" />
            <span>
              קראתי ואני מסכים/ה ל<Link href="/terms" className="font-semibold text-primary hover:underline">תנאי השימוש</Link>{" "}
              ול<Link href="/privacy" className="font-semibold text-primary hover:underline">מדיניות הפרטיות</Link>.
            </span>
          </label>
          {error && (
            <div role="alert" className="rounded-xl border border-[#f3c6c0] bg-[#fceeec] px-4 py-3 text-sm font-semibold text-risk-high">
              {error}
              {error.includes("כבר קיים") && (
                <span className="mt-1 block font-normal">
                  <Link href="/login" className="font-semibold text-primary hover:underline">למעבר לכניסה ←</Link>
                </span>
              )}
            </div>
          )}
          <button type="submit" disabled={pending} className="btn-primary press w-full py-3 disabled:opacity-50">
            {pending ? "נרשם…" : "צור חשבון"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-2">
          כבר יש לכם חשבון?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">כניסה</Link>
        </p>
      </div>
    </main>
  );
}
