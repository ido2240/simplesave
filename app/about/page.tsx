import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";

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
        <ol className="space-y-4">
          {STEPS.map((s) => (
            <li key={s.n} className="card flex gap-4 rounded-2xl p-5">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-2 to-primary-deep text-lg font-bold text-white">{s.n}</span>
              <div>
                <p className="text-lg font-bold">{s.t}</p>
                <p className="mt-0.5 text-ink-2">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
        <Link href="/new-mortgage" className="btn-primary press mt-8 inline-flex px-6 py-3">התחילו ←</Link>
      </main>
      <AppFooter />
    </>
  );
}
