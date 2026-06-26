// Supabase queries around a client's active mortgage request.
import "server-only";
import { supabaseServer } from "./supabase-server";

export interface RequestDetails {
  property_value: number; equity: number; loan_amount: number;
  loan_type: string; property_source: string; term_years: number;
  min_pay: number; max_pay: number;
}

export interface ActiveRequest {
  id: string;
  status: string;
  service_status: string;
  chosen_clock_id: string | null;
  advisor_id: string | null;
  details: RequestDetails | null;
}

/** Most recent request for a client, with details. */
export async function getActiveRequest(clientId: string): Promise<ActiveRequest | null> {
  const { data: req } = await (await supabaseServer())
    .from("requests")
    .select("id, status, service_status, chosen_clock_id, advisor_id")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!req) return null;
  const { data: details } = await (await supabaseServer())
    .from("request_details")
    .select("property_value, equity, loan_amount, loan_type, property_source, term_years, min_pay, max_pay")
    .eq("request_id", req.id)
    .maybeSingle();
  return { ...req, details: (details as RequestDetails) ?? null };
}
