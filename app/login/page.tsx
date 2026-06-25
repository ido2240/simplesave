"use client";

import { useActionState } from "react";
import { loginByEmail, quickLogin } from "./actions";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(loginByEmail, undefined);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-14">
      <div className="masthead-rule mb-8" />
      <p className="lbl mb-2">SIMPLESAVE</p>
      <h1 className="display mb-6 text-4xl font-bold">כניסה</h1>

      <form action={formAction} className="space-y-4">
        <label className="block">
          <span className="lbl mb-1 block">אימייל</span>
          <input
            name="email"
            type="email"
            required
            dir="ltr"
            placeholder="you@simplesave.co.il"
            className="w-full border border-rule bg-paper-2 px-3 py-2.5 text-left outline-none focus:border-ink"
          />
        </label>
        {error && <p className="text-sm text-brick">{error}</p>}
        <button type="submit" disabled={pending} className="w-full bg-ink py-3 font-bold text-paper disabled:opacity-50">
          {pending ? "מתחבר…" : "כניסה"}
        </button>
      </form>

      <div className="mt-10 border-t border-rule pt-6">
        <p className="lbl mb-3">כניסה מהירה (הדגמה)</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => quickLogin("client")} className="flex-1 border border-rule px-3 py-2 text-sm hover:bg-paper-2">לקוח · יוסי</button>
          <button onClick={() => quickLogin("advisor")} className="flex-1 border border-rule px-3 py-2 text-sm hover:bg-paper-2">יועץ · דן</button>
          <button onClick={() => quickLogin("admin")} className="flex-1 border border-rule px-3 py-2 text-sm hover:bg-paper-2">מנהל</button>
        </div>
      </div>
    </main>
  );
}
