import Link from "next/link";
import { currentUser } from "@/lib/session";
import { logout } from "@/app/login/actions";

const ROLE_LABEL: Record<string, string> = { client: "לקוח", advisor: "יועץ", admin: "מנהל" };

export default async function AppHeader() {
  const user = await currentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-[1240px] items-center justify-between gap-6 px-5 sm:px-7">
        {/* logo */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-2 to-primary-deep shadow-[0_6px_16px_-4px_rgba(37,73,201,0.5)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M4 13.5 12 6l8 7.5" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 19v-5h6v5" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
              </svg>
            </span>
            <span className="leading-none">
              <span className="display block text-xl font-extrabold tracking-tight">SimpleSave</span>
              <span className="mt-1 block text-[11px] font-medium text-ink-3">פשוט לחסוך</span>
            </span>
          </Link>

          <span className="hidden h-7 w-px bg-rule-strong sm:block" />

          <nav className="hidden items-center gap-1 text-sm font-medium text-ink-2 sm:flex">
            <Link href="/" className="rounded-lg px-3 py-2 hover:text-primary">דף הבית</Link>
            <Link href="/about" className="rounded-lg px-3 py-2 hover:text-primary">איך זה עובד</Link>
            {user?.role === "client" && (
              <Link href="/personal" className="rounded-lg px-3 py-2 hover:text-primary">האזור האישי</Link>
            )}
            {user?.role === "advisor" && (
              <Link href="/advisor" className="rounded-lg px-3 py-2 hover:text-primary">הלקוחות שלי</Link>
            )}
            {user?.role === "admin" && (
              <Link href="/admin" className="rounded-lg px-3 py-2 hover:text-primary">ניהול</Link>
            )}
          </nav>
        </div>

        {/* actions */}
        <div className="flex items-center gap-2.5">
          <Link href="/new-mortgage" className="btn-primary press px-5 py-2.5 text-sm">פתיחת בקשה</Link>
          {!user && (
            <Link href="/login" className="btn-ghost press px-4 py-2.5 text-sm">כניסה</Link>
          )}
          {user && (
            <>
              <span className="hidden text-xs font-semibold text-ink-3 sm:inline">
                {user.name} · {ROLE_LABEL[user.role]}
              </span>
              <form action={logout}>
                <button className="btn-ghost press px-3.5 py-2.5 text-sm">יציאה</button>
              </form>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
