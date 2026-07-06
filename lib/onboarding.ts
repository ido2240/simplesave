// Default onboarding rows for a new request — single source for the
// questionnaire action and the post-payment backfill (and mirrored in seed.ts).
export const DEFAULT_AUTH_BANKS = ["בנק הפועלים", "בנק לאומי", "מזרחי טפחות"] as const;

/** Mockup document checklist. The 6th item (כתבי הסמכה) is not a document row —
 *  it derives live from the authorizations table on the documents screen. */
export const DEFAULT_DOCUMENTS: { kind: string; required: boolean }[] = [
  { kind: "תדפיס עו״ש 3 חודשים", required: true },
  { kind: "תלושי שכר 3 חודשים", required: true },
  { kind: "צילום ת״ז + ספח", required: true },
  { kind: "חוזה רכישה", required: true },
  { kind: "הערכת שמאי", required: false },
];
