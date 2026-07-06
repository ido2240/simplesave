import Link from "next/link";

export default function AppFooter() {
  return (
    <footer className="mt-auto bg-gradient-to-l from-[#14224a] to-[#1e327a] text-white">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-5 px-5 py-10 sm:px-7">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 13.5 12 6l8 7.5" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <div className="display text-lg font-extrabold">SimpleSave</div>
            <div className="text-xs text-white/60">פשוט לחסוך · © 2026 כל הזכויות שמורות</div>
          </div>
        </div>
        <nav className="flex items-center gap-4 text-[13px] text-white/75" aria-label="קישורים משפטיים">
          <Link href="/terms" className="hover:text-white hover:underline">תנאי שימוש</Link>
          <Link href="/privacy" className="hover:text-white hover:underline">מדיניות פרטיות</Link>
          <span className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 3 5 6v5c0 4.4 3 8 7 10 4-2 7-5.6 7-10V6l-7-3Z" stroke="#7DE6B4" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
            מאובטח בתקן 13 לחוק הגנת הפרטיות
          </span>
        </nav>
      </div>
    </footer>
  );
}
