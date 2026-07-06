import type { Metadata } from "next";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";

export const metadata: Metadata = {
  title: "תנאי שימוש · SimpleSave",
  description: "תנאי השימוש בפלטפורמת SimpleSave — הדגמה, ללא ייעוץ משכנתאי או פיננסי.",
};

export default function TermsPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12 sm:px-7">
        <h1 className="display mb-2 text-4xl font-bold">תנאי שימוש</h1>
        <p className="mb-8 text-sm text-ink-3">עדכון אחרון: יולי 2026</p>

        <div className="space-y-6 text-[15px] leading-7 text-ink-2">
          <section>
            <h2 className="display mb-2 text-xl font-bold text-ink">1. מהות השירות</h2>
            <p>
              SimpleSave היא פלטפורמת הדגמה חינוכית להשוואת תמהילי משכנתא, מחזור וביטוח.
              <b> המערכת אינה מעניקה ייעוץ משכנתאי, פיננסי או ביטוחי</b>, והחישובים בה — כולל
              תעריפי הביטוח המשוערים — הם להמחשה בלבד ואינם הצעה מחייבת.
            </p>
          </section>
          <section>
            <h2 className="display mb-2 text-xl font-bold text-ink">2. חשבון ושימוש הוגן</h2>
            <p>
              ההרשמה דורשת פרטים נכונים ושמירה על סודיות הסיסמה. אין להשתמש במערכת לרעה, לנסות
              לגשת לנתונים של אחרים או לשבש את פעולתה.
            </p>
          </section>
          <section>
            <h2 className="display mb-2 text-xl font-bold text-ink">3. תשלום (סביבת הדגמה)</h2>
            <p>
              עמוד התשלום פועל בסביבת דמו (Sandbox) — לא מתבצע חיוב אמיתי. בגרסה מסחרית ישולב ספק
              סליקה מאושר ותנאי התשלום יעודכנו בהתאם.
            </p>
          </section>
          <section>
            <h2 className="display mb-2 text-xl font-bold text-ink">4. אחריות</h2>
            <p>
              ההחלטה על נטילת משכנתא היא שלכם בלבד ומחייבת בדיקה מול גורם מוסמך. המערכת מסופקת
              כפי-שהיא (AS-IS) ללא אחריות לתוצאות החישובים או לזמינות השירות.
            </p>
          </section>
          <section>
            <h2 className="display mb-2 text-xl font-bold text-ink">5. פרטיות</h2>
            <p>
              השימוש כפוף גם ל<a href="/privacy" className="font-semibold text-primary hover:underline">מדיניות הפרטיות</a>.
            </p>
          </section>
        </div>
      </main>
      <AppFooter />
    </>
  );
}
