"use server";

import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requireRole } from "@/lib/session";
import { computeLoanAmountNew, type LoanType, type PropertySource } from "@/lib/engine";

export async function saveNewMortgage(formData: FormData) {
  const user = await requireRole("client");
  const db = supabase();

  const propertyValue = Number(formData.get("propertyValue") || 0);
  const equity = Number(formData.get("equity") || 0);
  const loanType = String(formData.get("loanType") || "single_property") as LoanType;
  const propertySource = String(formData.get("propertySource") || "second_hand") as PropertySource;
  const termYears = Number(formData.get("termYears") || 30);
  const minPay = Number(formData.get("minPay") || 0);
  const maxPay = Number(formData.get("maxPay") || 0);
  const birthDate = String(formData.get("birthDate") || "");
  const netIncome = Number(formData.get("netIncome") || 0);

  const loan = computeLoanAmountNew({
    loanType, propertySource, propertyValue, equity,
    borrowers: [], additionalIncome: 0, fixedExpenses: 0,
    desiredMinPayment: minPay, desiredMaxPayment: maxPay, existingMortgageBalance: 0,
  });

  const { data: existing } = await db
    .from("requests").select("id").eq("client_id", user.id)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();

  let requestId = existing?.id as string | undefined;
  if (!requestId) {
    const { data } = await db.from("requests")
      .insert({ client_id: user.id, service: "new_mortgage", status: "clocks" })
      .select("id").single();
    requestId = data!.id;
    // default onboarding rows for the demo
    await db.from("authorizations").insert([
      { request_id: requestId, bank: "בנק הפועלים" },
      { request_id: requestId, bank: "בנק לאומי" },
      { request_id: requestId, bank: "מזרחי טפחות" },
    ]);
    await db.from("documents").insert([
      { request_id: requestId, kind: "תעודת זהות" },
      { request_id: requestId, kind: "תלושי שכר (3 אחרונים)" },
      { request_id: requestId, kind: "דפי חשבון בנק" },
    ]);
  } else {
    await db.from("requests").update({ status: "clocks" }).eq("id", requestId);
  }

  const details = {
    request_id: requestId, property_value: propertyValue, equity, loan_amount: loan,
    loan_type: loanType, property_source: propertySource, term_years: termYears, min_pay: minPay, max_pay: maxPay,
  };
  await db.from("request_details").upsert(details, { onConflict: "request_id" });
  await db.from("borrowers").delete().eq("request_id", requestId);
  await db.from("borrowers").insert({
    request_id: requestId, full_name: user.name, birth_date: birthDate, net_income: netIncome, is_property_owner: true,
  });

  redirect("/new-mortgage/clocks");
}
