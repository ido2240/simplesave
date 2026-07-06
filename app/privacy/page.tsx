import type { Metadata } from "next";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";

export const metadata: Metadata = {
  title: "מדיניות פרטיות · SimpleSave",
  description: "מדיניות הפרטיות של SimpleSave — איזה מידע נאסף, למה הוא משמש, ומהן זכויותיכם לפי חוק הגנת הפרטיות.",
};

// Privacy policy per the spec's requirement (Israeli Privacy Protection
// Regulations — incl. Takana 13 notice duties for data collection).
export default function PrivacyPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12 sm:px-7">
        <h1 className="display mb-2 text-4xl font-bold">מדיניות פרטיות</h1>
        <p className="mb-8 text-sm text-ink-3">עדכון אחרון: יולי 2026 · פלטפורמת הדגמה — SimpleSave</p>

        <div className="space-y-6 text-[15px] leading-7 text-ink-2">
          <section>
            <h2 className="display mb-2 text-xl font-bold text-ink">1. כללי</h2>
            <p>
              SimpleSave (״המערכת״) היא פלטפורמת הדגמה להשוואת תמהילי משכנתא. מסמך זה מפרט איזה מידע נאסף,
              לאיזו מטרה, למי הוא נמסר ומהן זכויותיכם — בהתאם לחוק הגנת הפרטיות, התשמ״א-1981 ותקנותיו,
              ובכלל זה חובת היידוע לפי סעיף 11 לחוק (תקנה 13 לתקנות הרלוונטיות).
            </p>
          </section>
          <section>
            <h2 className="display mb-2 text-xl font-bold text-ink">2. המידע שנאסף וחובת מסירה</h2>
            <p>
              בעת שימוש בשאלון ובאזור האישי נאספים: פרטי זיהוי (שם, אימייל), נתונים פיננסיים שמסרתם
              (שווי נכס, הון עצמי, הכנסות, הוצאות, פרטי לווים ותאריכי לידה), מסמכים שהעליתם, והודעות ליועץ.
              <b> לא חלה עליכם חובה חוקית למסור את המידע</b> — מסירתו תלויה ברצונכם; בלעדיו לא נוכל לחשב
              תמהילים או ללוות את התהליך.
            </p>
          </section>
          <section>
            <h2 className="display mb-2 text-xl font-bold text-ink">3. מטרות השימוש</h2>
            <p>
              המידע משמש לחישוב תמהילי המשכנתא, לליווי הבקשה מול היועץ, לניהול המסמכים והאישורים,
              ולתפעול החשבון. המידע אינו נמכר ואינו משמש לדיוור פרסומי של צדדים שלישיים.
            </p>
          </section>
          <section>
            <h2 className="display mb-2 text-xl font-bold text-ink">4. מי נחשף למידע</h2>
            <p>
              הגישה מוגבלת בהרשאות: אתם רואים רק את הבקשה שלכם; היועץ המשויך רואה את תיקי הלקוחות שלו בלבד;
              מנהל המערכת רואה נתונים תפעוליים. המידע מאוחסן אצל ספק אירוח הנתונים Supabase (בשרתי האיחוד
              האירופי) תחת בקרות גישה ברמת שורה (RLS).
            </p>
          </section>
          <section>
            <h2 className="display mb-2 text-xl font-bold text-ink">5. אבטחת מידע</h2>
            <p>
              סיסמאות מאוחסנות מוצפנות (bcrypt); התקשורת מוצפנת (TLS); מסמכים נשמרים באחסון פרטי עם
              קישורי צפייה זמניים; והגישה לנתונים נאכפת גם בשכבת מסד הנתונים.
            </p>
          </section>
          <section>
            <h2 className="display mb-2 text-xl font-bold text-ink">6. זכויותיכם</h2>
            <p>
              זכותכם לעיין במידע שנאסף עליכם, לבקש תיקון או מחיקה, ולמשוך את הסכמתכם. לפניות:
              דרך מסך ״הודעות ליועץ״ או באימייל המפורט בעמוד הבית. אינכם מרוצים מהטיפול? ניתן לפנות
              לרשות להגנת הפרטיות.
            </p>
          </section>
          <section>
            <h2 className="display mb-2 text-xl font-bold text-ink">7. עוגיות (Cookies)</h2>
            <p>
              המערכת משתמשת בעוגיות חיוניות בלבד — ניהול ההתחברות (session). אין עוגיות פרסום או מעקב.
            </p>
          </section>
        </div>
      </main>
      <AppFooter />
    </>
  );
}
