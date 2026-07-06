"use client";

// Global error boundary — failed server actions and render errors land here
// with a Hebrew recovery path instead of a blank crash.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = error?.message?.length && error.message.length < 120 && /[֐-׿]/.test(error.message)
    ? error.message
    : "משהו השתבש. נסו שוב — אם הבעיה חוזרת, פנו אלינו.";

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">
      <p className="mb-2 text-4xl">😕</p>
      <h1 className="display mb-2 text-2xl font-bold">אופס — הפעולה לא הושלמה</h1>
      <p className="mb-6 max-w-md text-ink-2">{message}</p>
      <div className="flex gap-3">
        <button onClick={reset} className="btn-primary press px-6 py-3">נסו שוב</button>
        <a href="/" className="btn-ghost press px-6 py-3">לעמוד הבית</a>
      </div>
      {error?.digest && <p className="num mt-6 text-xs text-ink-3">קוד שגיאה: {error.digest}</p>}
    </main>
  );
}
