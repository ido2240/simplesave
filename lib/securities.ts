// Collateral / securities (בטחונות) — read helpers + shared options.
import "server-only";
import { supabase } from "./supabase";

export interface Security {
  id: string;
  request_id: string;
  description: string;
  kind: string;
}

/** Common collateral the advisor can pick from (spec §13: select from options). */
export const SECURITY_OPTIONS = [
  "שעבוד הנכס הנרכש",
  "ביטוח חיים למשכנתא",
  "ביטוח מבנה",
  "המחאת זכויות חוזית",
  "ערבות צד ג׳",
  "פיקדון / בטוחה נזילה",
];

export async function listSecurities(requestId: string): Promise<Security[]> {
  const { data } = await supabase()
    .from("securities")
    .select("id, request_id, description, kind")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  return (data ?? []) as Security[];
}
