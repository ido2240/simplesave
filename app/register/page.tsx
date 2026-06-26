"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerUser } from "./actions";

const inputCls = "w-full rounded-xl border border-rule-strong bg-paper px-4 py-3 outline-none focus:border-primary";

export default function RegisterPage() {
  const [error, formAction, pending] = useActionState(registerUser, undefined);

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
            <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">סיסמה (לפחות 8 תווים)</span>
            <input name="password" type="password" required dir="ltr" minLength={8} className={`${inputCls} text-left`} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">אימות סיסמה</span>
            <input name="confirm" type="password" required dir="ltr" className={`${inputCls} text-left`} />
          </label>
          {error && <p className="text-sm text-risk-high">{error}</p>}
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
