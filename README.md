# SimpleSave — פלטפורמת משכנתאות (Next.js + Supabase)

> **כלי הדגמה בלבד — אינו מהווה ייעוץ משכנתאי או פיננסי מורשה.**

SimpleSave מחליף את שיחת הייעוץ הראשונית: לקוח עונה על שאלון עברי קצר ומקבל מיד
**חמישה תמהילי משכנתא ("שעונים")** — כל אחד תערובת אחרת של מסלולים (קבועה / פריים /
משתנה, צמודה או לא), עם החזר חודשי ראשון, עלות כוללת, פירוק קרן/ריבית, ומד-סיכון
בצבע אחד. משם: חתימת כתבי הרשאה, העלאת מסמכים, צ'אט עם יועץ, ומעקב — על פני שלושה
תפקידים (לקוח / יועץ / מנהל) שחולקים נתונים.

מנוע החישוב הוא **פורט TypeScript של מנוע פייתון מאומת**, שנבדק ב-parity מול אותו
מנוע על 140 תרחישים.

---

## Tech stack

- **Next.js 16** (App Router) + **TypeScript** (strict)
- **Tailwind CSS v4** — עיצוב עברי RTL (Frank Ruhl Libre + Assistant)
- **Supabase (Postgres)** — בסיס הנתונים; גישה צד-שרת
- **Recharts** — גרף קרן/ריבית · **Vitest** — בדיקות מנוע + שער parity
- **zod** — אימות גוף הבקשות ב-API

---

## אימות המנוע (parity)

המנוע ב-`lib/engine/` הוא פורט פונקציה-מול-פונקציה ממנוע הפייתון המקורי. שער ה-parity
(`lib/engine/__tests__/parity.test.ts`) מריץ את אותה סוללת 140 התרחישים שמנוע
הפייתון נבדק עליה, ומשווה ל-golden שנוצר ממנו:

```
140 תרחישים (route / mix / risk / tune) · 164,491 ערכים מספריים
הפרש מוחלט מקסימלי = 1.86e-9  → זהה (רעש נקודה צפה)
```

`golden.json` הוקפא מתוך מנוע הפייתון לפני שהוסר; הבדיקה רצה עצמאית מולו.

---

## הרצה מקומית

```bash
cp .env.example .env.local      # מלאו SUPABASE_URL + SUPABASE_ANON_KEY
npm install
# הסכמה כבר הוחלה על פרויקט ה-Supabase (supabase/migrations/0001_init.sql)
npm run seed                    # פרמטרים, 5 שעונים, משתמשי הדגמה, בקשה לדוגמה
npm run dev                     # http://localhost:3000
```

> `npm run seed` רץ עם `--env-file=.env.local` (ראו `package.json`).

### משתמשי הדגמה

| תפקיד | אימייל |
|------|--------|
| מנהל | `admin@simplesave.co.il` |
| יועץ | `dan@simplesave.co.il` |
| לקוח | `yossi@simplesave.co.il` |
| לקוח | `maya@simplesave.co.il` |

הכניסה היא ללא סיסמה (הדגמה): בעמוד `/login` יש כפתורי "כניסה מהירה" לכל תפקיד.
בייצור מחליפים ל-Supabase Auth (GoTrue) + RLS.

---

## מבנה הפרויקט

```
lib/engine/          # מנוע טהור (ללא React/DB/IO) — הליבה המאומתת
  types.ts core.ts route.ts mix.ts risk.ts tuning.ts clocks.ts rules.ts
  __tests__/parity.test.ts + golden.json   # שער ה-parity
lib/                 # supabase, session (mock auth), engine-config, requests,
                     # billing, payments, messages, format, api-schemas (zod)
app/                 # App Router — דפי לקוח/יועץ/מנהל + app/api/* (route handlers)
components/          # ClockCard, RiskGauge, AmortizationChart, ...
supabase/            # migrations/0001_init.sql + seed.ts
reference/           # הסימולטור המקורי (תיעוד — המקור למתמטיקה)
PORT_PLAN.md         # מיפוי הפורט מ-Python ל-TypeScript
```

## בדיקות ובנייה

```bash
npm test     # Vitest — מנוע + שער parity
npm run build
npm run lint
```

## הערות (החלטות שנשמרו מהמקור)

- **5 השעונים** = תבניות הרפרנס המאומתות; `clock4` כפיל מדויק של `clock1` ו-`clock5 ≈ clock3`
  (מאפיין מקור) — נשמרים אך **מסומנים** במסך המנהל (`duplicate_of`).
- **הצמדה** מחושבת שנתית (`annual/12`) — קירוב ענפי מקובל.
- **יחס החזר 38%**, גיל מקס׳ 85 (משכנתא חדשה) / 80 (מחזור) — ניתנים להגדרה.
- **ביטוח** ו**פרסור PDF יתרות** חסומים עד שיסופקו טבלאות התעריפים / מנוע הפרסור —
  לא ממציאים מספרים.

## דמו ב-2 דקות

1. `npm run dev` → פותחים `http://localhost:3000`.
2. `/login` → "לקוח · יוסי".
3. "משכנתא חדשה" → ממלאים שאלון → **חמישה שעונים** עם החזרים שונים ומד-סיכון.
4. "פירוט" על שעון → גרף קרן/ריבית. "בחר" → נשמר באזור האישי.
5. אזור אישי → "שדרג" → תשלום מדומה → נפתחים כתבי הרשאה ומסמכים.
6. `/login` → "מנהל" → "פרמטרים כלכליים" → משנים את המדד → השעונים מתעדכנים.
7. `/login` → "יועץ · דן" → רואים את יוסי, מאשרים מסמך, שולחים הודעה.
