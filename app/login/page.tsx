"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginByEmail, quickLogin } from "./actions";

const DEMO = [
  { role: "admin" as const, label: "מנהל", email: "admin@simplesave.co.il", password: "Admin1234!" },
  { role: "advisor" as const, label: "יועץ · דן", email: "dan@simplesave.co.il", password: "Advisor1234!" },
  { role: "client" as const, label: "לקוח · יוסי", email: "yossi@simplesave.co.il", password: "Client1234!" },
];

const inputCls = "w-full rounded-xl border border-rule-strong bg-paper px-4 py-3 outline-none focus:border-primary";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(loginByEmail, undefined);

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
        <h1 className="display mb-1 mt-6 text-3xl font-bold">כניסה</h1>
        <p className="mb-6 text-sm text-ink-2">התחברו כדי לראות את הבקשות והאזור האישי שלכם.</p>

        <form action={formAction} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">אימייל</span>
            <input name="email" type="email" required dir="ltr" placeholder="you@simplesave.co.il" className={`${inputCls} text-left`} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">סיסמה</span>
            <input name="password" type="password" required dir="ltr" placeholder="••••••••" className={`${inputCls} text-left`} />
          </label>
          {error && <p className="text-sm text-risk-high">{error}</p>}
          <button type="submit" disabled={pending} className="btn-primary press w-full py-3 disabled:opacity-50">
            {pending ? "מתחבר…" : "כניסה"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-2">
          אין לכם חשבון?{" "}
          <Link href="/register" className="font-semibold text-primary hover:underline">הרשמה</Link>
        </p>

        <div className="mt-7 border-t border-rule pt-6">
          <p className="mb-3 text-[13px] font-semibold text-ink-3">כניסה מהירה — חשבונות הדגמה</p>
          <div className="grid grid-cols-3 gap-2">
            {DEMO.map((d) => (
              <form key={d.role} action={quickLogin.bind(null, d.role)}>
                <button className="btn-ghost press w-full px-2 py-2.5 text-xs font-semibold">{d.label}</button>
              </form>
            ))}
          </div>
          <div className="mt-3 space-y-0.5 text-[11px] text-ink-3">
            {DEMO.map((d) => (
              <p key={d.role} dir="ltr" className="text-left">
                <span className="font-semibold">{d.email}</span> · {d.password}
              </p>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
