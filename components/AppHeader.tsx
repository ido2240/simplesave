import Link from "next/link";
import { currentUser } from "@/lib/session";
import { logout } from "@/app/login/actions";

const ROLE_LABEL: Record<string, string> = { client: "לקוח", advisor: "יועץ", admin: "מנהל" };

export default async function AppHeader() {
  const user = await currentUser();

  return (
    <header className="sticky top-0 z-20 bg-paper/95 backdrop-blur">
      <div className="masthead-rule" />
      <div className="mx-auto flex max-w-[1140px] items-center justify-between px-5 py-3">
        <Link href="/" className="display text-xl font-bold tracking-tight">
          SimpleSave<span className="text-ember">.</span>
        </Link>

        <nav className="flex items-center gap-3 text-sm">
          {!user && <Link href="/login" className="font-bold hover:text-ember">כניסה</Link>}
          {user?.role === "client" && (
            <>
              <Link href="/new-mortgage" className="hidden hover:text-ember sm:inline">משכנתא</Link>
              <Link href="/personal" className="hover:text-ember">אזור אישי</Link>
            </>
          )}
          {user?.role === "advisor" && <Link href="/advisor" className="hover:text-ember">לקוחות</Link>}
          {user?.role === "admin" && <Link href="/admin" className="hover:text-ember">ניהול</Link>}
          {user && (
            <>
              <span className="lbl hidden sm:inline">{user.name} · {ROLE_LABEL[user.role]}</span>
              <form action={logout}>
                <button className="border border-rule px-2.5 py-1 text-xs hover:bg-paper-2">יציאה</button>
              </form>
            </>
          )}
        </nav>
      </div>
      <div className="h-px bg-rule" />
    </header>
  );
}
