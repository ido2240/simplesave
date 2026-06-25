import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { currentUser } from "@/lib/session";

const SERVICES = [
  { href: "/new-mortgage", title: "משכנתא חדשה", desc: "השוואת חמישה תמהילים לרכישת נכס" },
  { href: "/refinance", title: "מחזור משכנתא", desc: "בדיקה אם כדאי למחזר את ההלוואה הקיימת" },
  { href: "/insurance", title: "ביטוח משכנתא", desc: "השוואת ביטוח חיים ומבנה" },
];

export default async function Home() {
  const user = await currentUser();
  const cta = user?.role === "advisor" ? "/advisor" : user?.role === "admin" ? "/admin" : "/new-mortgage";

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-[1140px] flex-1 px-5 py-12">
        <p className="lbl mb-3">משכנתא · מחזור · ביטוח</p>
        <h1 className="display max-w-3xl text-4xl font-black leading-[1.06] sm:text-6xl">
          חמישה תמהילים. <span className="text-ember">החלטה אחת</span> טובה יותר.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-ink-2">
          ענו על שאלון קצר וקבלו חמישה תמהילי משכנתא — כל אחד עם החזר חודשי, עלות כוללת,
          פירוק קרן/ריבית ומד-סיכון אחד וברור. מנוע החישוב מאומת מול הסימולטור המקורי.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={cta} className="bg-ink px-6 py-3 font-bold text-paper hover:bg-ink-2">
            {user ? "המשך" : "התחילו עכשיו"}
          </Link>
          <Link href="/about" className="border border-rule px-6 py-3 hover:bg-paper-2">איך זה עובד</Link>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {SERVICES.map((s) => (
            <Link key={s.href} href={s.href} className="border border-rule p-5 hover:bg-paper-2">
              <p className="display text-xl font-bold">{s.title}</p>
              <p className="mt-1 text-sm text-ink-3">{s.desc}</p>
            </Link>
          ))}
        </div>

        <p className="mt-12 text-xs text-ink-3">כלי הדגמה — אינו מהווה ייעוץ משכנתאי או פיננסי מורשה.</p>
      </main>
    </>
  );
}
