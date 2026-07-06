// The mockup's 8-step client journey stepper, derived from real request state.
import "server-only";
import { supabaseServer } from "./supabase-server";
import type { ActiveRequest } from "./requests";

export const STAGE_LABELS = [
  "שאלון", "הצעות", "הרשמה", "מילוי פרטים", "מסמכים", "אישור עקרוני", "בחירת בנק", "חתימה",
] as const;

export interface StageStep {
  label: string;
  done: boolean;
  current: boolean;
}

export interface StageInfo {
  steps: StageStep[];
  /** index of the current step; STAGE_LABELS.length = journey complete */
  index: number;
}

/** Derive the journey position:
 *  שאלון: request+details exist · הצעות: clock chosen · הרשמה: real account
 *  (always true once signed in) · מילוי פרטים: service paid · מסמכים: all
 *  required docs approved + authorizations signed · אישור עקרוני: a bank
 *  approved · בחירת בנק: best offer marked · חתימה: executed mortgage exists. */
export async function requestStage(req: ActiveRequest | null): Promise<StageInfo> {
  let idx = 0;
  if (req?.details && req.details.loan_amount > 0) idx = 1;
  if (idx === 1 && req?.chosen_clock_id) idx = 3; // הצעות done; הרשמה done (authenticated)
  if (idx === 3 && req?.service_status === "PAID") idx = 4;

  if (idx === 4 && req) {
    const db = await supabaseServer();
    const [{ data: docs }, { data: auths }] = await Promise.all([
      db.from("documents").select("status, required").eq("request_id", req.id),
      db.from("authorizations").select("signed").eq("request_id", req.id),
    ]);
    const docsDone =
      (docs ?? []).filter((d) => d.required).every((d) => d.status === "תקין") &&
      (auths ?? []).length > 0 && (auths ?? []).every((a) => a.signed);
    if (docsDone) {
      idx = 5;
      const { data: offers } = await db.from("bank_offers").select("approved, is_best").eq("request_id", req.id);
      if ((offers ?? []).some((o) => o.approved)) idx = 6;
      if ((offers ?? []).some((o) => o.approved && o.is_best)) idx = 7;
      const { data: active } = await db.from("active_mortgages").select("request_id").eq("request_id", req.id).maybeSingle();
      if (active) idx = 8;
    }
  }

  return {
    index: idx,
    steps: STAGE_LABELS.map((label, i) => ({ label, done: i < idx, current: i === idx })),
  };
}
