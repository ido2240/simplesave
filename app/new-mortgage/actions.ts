"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { requireRole } from "@/lib/session";
import { DEFAULT_AUTH_BANKS, DEFAULT_DOCUMENTS } from "@/lib/onboarding";
import {
  DEFAULT_PAYMENT_TO_INCOME_RATIO,
  computeLoanAmountNew,
  validateNewMortgage,
  type LoanType,
  type PropertySource,
  type BorrowerInput,
  type ValidationIssue,
} from "@/lib/engine";

export interface SaveState {
  issues: ValidationIssue[];
}

const RATIO = Number(process.env.PAYMENT_TO_INCOME_RATIO || DEFAULT_PAYMENT_TO_INCOME_RATIO);
const MAX_AGE = Number(process.env.MAX_AGE_NEW_MORTGAGE || 85);

/** Persist the questionnaire after server-side validation. Returns issues on
 *  failure; redirects to the clocks on success. Used with useActionState. */
export async function saveNewMortgage(
  _prev: SaveState | undefined,
  formData: FormData,
): Promise<SaveState> {
  const user = await requireRole("client");
  const db = await supabaseServer();

  const propertyValue = Number(formData.get("propertyValue") || 0);
  const equity = Number(formData.get("equity") || 0);
  const loanType = String(formData.get("loanType") || "single_property") as LoanType;
  const propertySource = String(formData.get("propertySource") || "second_hand") as PropertySource;
  const termYears = Number(formData.get("termYears") || 30);
  const minPay = Number(formData.get("minPay") || 0);
  const maxPay = Number(formData.get("maxPay") || 0);
  const additionalIncome = Number(formData.get("additionalIncome") || 0);
  const fixedExpenses = Number(formData.get("fixedExpenses") || 0);

  // Borrower rows arrive as parallel arrays (DOM order preserved).
  const names = formData.getAll("bFullName").map(String);
  const births = formData.getAll("bBirthDate").map(String);
  const incomes = formData.getAll("bNetIncome").map((v) => Number(v || 0));
  const owners = formData.getAll("bIsOwner").map((v) => String(v) === "1");
  const borrowers: BorrowerInput[] = names.map((fullName, i) => ({
    fullName: fullName.trim(),
    birthDate: births[i] ? births[i] : null,
    netIncome: incomes[i] ?? 0,
    isPropertyOwner: owners[i] ?? true,
  }));

  const input = {
    loanType, propertySource, propertyValue, equity, borrowers,
    additionalIncome, fixedExpenses,
    desiredMinPayment: minPay, desiredMaxPayment: maxPay, existingMortgageBalance: 0,
  };

  const validation = validateNewMortgage(input, { paymentRatio: RATIO, maxAge: MAX_AGE });
  if (!validation.ok) return { issues: validation.issues };

  const loan = computeLoanAmountNew(input);

  const { data: existing } = await db
    .from("requests").select("id").eq("client_id", user.id)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();

  let requestId = existing?.id as string | undefined;
  if (!requestId) {
    const { data } = await db.from("requests")
      .insert({ client_id: user.id, service: "new_mortgage", status: "clocks" })
      .select("id").single();
    requestId = data!.id;
    // default onboarding rows for a new request
    await db.from("authorizations").insert(
      DEFAULT_AUTH_BANKS.map((bank) => ({ request_id: requestId, bank })),
    );
    await db.from("documents").insert(
      DEFAULT_DOCUMENTS.map((d) => ({ request_id: requestId, ...d })),
    );
  } else {
    await db.from("requests").update({ status: "clocks" }).eq("id", requestId);
  }

  const details = {
    request_id: requestId, property_value: propertyValue, equity, loan_amount: loan,
    loan_type: loanType, property_source: propertySource, term_years: termYears, min_pay: minPay, max_pay: maxPay,
  };
  await db.from("request_details").upsert(details, { onConflict: "request_id" });

  // Household additional income / fixed expenses are stored on the first borrower.
  const rows = borrowers.map((b, i) => ({
    request_id: requestId, full_name: b.fullName, birth_date: b.birthDate ?? "",
    net_income: b.netIncome, is_property_owner: b.isPropertyOwner,
    additional_income: i === 0 ? additionalIncome : 0,
    fixed_expenses: i === 0 ? fixedExpenses : 0,
  }));
  await db.from("borrowers").delete().eq("request_id", requestId);
  await db.from("borrowers").insert(rows);

  redirect("/new-mortgage/clocks");
}
