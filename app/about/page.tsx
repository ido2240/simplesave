import Link from "next/link";
import AppHeader from "@/components/AppHeader";

const STEPS = [
  { n: "1", t: "שאלון קצר", d: "פרטי הנכס, ההון העצמי, ההכנסה וההחזר החודשי הרצוי." },
  { n: "2", t: "חמישה תמהילים", d: "המנוע מחשב חמש אסטרטגיות, כל אחת עם החזר, עלות ומד-סיכון." },
  { n: "3", t: "בחירה וליווי", d: "בוחרים תמהיל, חותמים כתבי הרשאה, מעלים מסמכים, ויועץ מלווה עד הסוף." },
];

export default function AboutPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12">
        <h1 className="display mb-3 text-4xl font-black">איך זה עובד</h1>
        <p className="mb-8 text-ink-2">
          SimpleSave מחליף את שיחת הייעוץ הראשונית: במקום לנחש, מקבלים חמש הצעות תמהיל
          מבוססות-נתונים תוך דקה — מנוע מאומת מול הסימולטור המקורי.
        </p>
        <ol className="space-y-5">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-4 border-b border-rule pb-5">
              <span className="display text-3xl font-black text-ember">{s.n}</span>
              <div>
                <p className="display text-lg font-bold">{s.t}</p>
                <p className="text-ink-2">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
        <Link href="/new-mortgage" className="mt-8 inline-block bg-ink px-6 py-3 font-bold text-paper hover:bg-ink-2">התחילו ←</Link>
      </main>
    </>
  );
}
