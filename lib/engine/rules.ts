// Regulatory validations — port of src/simplesave/engine/validation.py.
// Provisional ceilings from DECISIONS.md (DTI 38%, age 85 new / 80 refinance).

export type LoanType = "single_property" | "additional_property" | "all_purpose" | "improvement";
export type PropertySource = "contractor" | "second_hand" | "target_price" | "self_build";

export const DEFAULT_PAYMENT_TO_INCOME_RATIO = 0.38; // D-3
export const DEFAULT_MAX_AGE_NEW_MORTGAGE = 85; // D-4
export const DEFAULT_MAX_AGE_REFINANCE = 80; // D-5
export const MIN_BORROWER_AGE = 18;
export const MAX_MORTGAGE_TERM_YEARS = 30;
export const TARGET_PRICE_MIN_EQUITY = 100_000;

export interface BorrowerInput {
  fullName: string;
  birthDate: string | null; // ISO yyyy-mm-dd
  isPropertyOwner: boolean;
  netIncome: number;
}

export interface NewMortgageInput {
  loanType: LoanType;
  propertySource: PropertySource;
  propertyValue: number;
  equity: number;
  borrowers: BorrowerInput[];
  additionalIncome: number;
  fixedExpenses: number;
  desiredMinPayment: number;
  desiredMaxPayment: number;
  existingMortgageBalance: number;
}

export interface RefinanceInput {
  propertyValue: number;
  borrowers: BorrowerInput[];
  additionalIncome: number;
  fixedExpenses: number;
  desiredMinPayment: number;
  desiredMaxPayment: number;
  existingRoutesBalance: number;
  adjustPayment: boolean;
}

export interface ValidationIssue {
  field: string;
  message: string;
}
export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
  computed: Record<string, number | boolean>;
}

function ageOnDate(birth: Date, on: Date): number {
  let years = on.getFullYear() - birth.getFullYear();
  const m = on.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && on.getDate() < birth.getDate())) years -= 1;
  return years;
}

function oldestBorrowerAge(borrowers: BorrowerInput[], on: Date): number | null {
  const ages = borrowers
    .filter((b) => b.birthDate)
    .map((b) => ageOnDate(new Date(b.birthDate as string), on));
  return ages.length ? Math.max(...ages) : null;
}

function countingIncome(borrowers: BorrowerInput[]): number {
  return borrowers.reduce((sum, b) => sum + (b.isPropertyOwner ? b.netIncome : b.netIncome * 0.5), 0);
}

export function netIncomeForCapacity(borrowers: BorrowerInput[], additional: number, expenses: number): number {
  return countingIncome(borrowers) + additional - expenses;
}

export function maxAllowedPayment(net: number, ratio = DEFAULT_PAYMENT_TO_INCOME_RATIO): number {
  return Math.max(0, net * ratio);
}

export function financingLimitPct(loanType: LoanType, source: PropertySource): number {
  if (loanType === "single_property") return source === "target_price" ? 0.9 : 0.75;
  if (loanType === "improvement") return 0.7;
  if (loanType === "additional_property" || loanType === "all_purpose") return 0.5;
  return 0.75;
}

export function minEquityPct(loanType: LoanType, source: PropertySource): number {
  if (source === "target_price") return 0.1;
  if (loanType === "additional_property" || loanType === "all_purpose") return 0.5;
  return 0.25;
}

export function computeLoanAmountNew(data: NewMortgageInput): number {
  const limitPct = financingLimitPct(data.loanType, data.propertySource);
  let maxLoan = data.propertyValue * limitPct;
  if (data.loanType === "all_purpose") {
    maxLoan = Math.max(0, data.propertyValue * 0.5 - data.existingMortgageBalance);
  }
  return Math.max(0, Math.min(maxLoan, data.propertyValue - data.equity));
}

function newResult(): ValidationResult {
  return { ok: true, issues: [], computed: {} };
}
function add(r: ValidationResult, field: string, message: string): void {
  r.ok = false;
  r.issues.push({ field, message });
}

export function validateNewMortgage(
  data: NewMortgageInput,
  opts: { today?: Date; paymentRatio?: number; maxAge?: number } = {},
): ValidationResult {
  const on = opts.today ?? new Date();
  const paymentRatio = opts.paymentRatio ?? DEFAULT_PAYMENT_TO_INCOME_RATIO;
  const maxAge = opts.maxAge ?? DEFAULT_MAX_AGE_NEW_MORTGAGE;
  const result = newResult();

  if (!data.borrowers.length) add(result, "borrowers", "יש להזין לפחות לווה אחד.");
  if (data.propertyValue <= 0) add(result, "property_value", "שווי הנכס חייב להיות חיובי.");
  if (data.equity < 0) add(result, "equity", "הון עצמי לא יכול להיות שלילי.");

  const minEqPct = minEquityPct(data.loanType, data.propertySource);
  let requiredEquity = data.propertyValue * minEqPct;
  if (data.propertySource === "target_price") requiredEquity = Math.max(requiredEquity, TARGET_PRICE_MIN_EQUITY);
  if (data.equity < requiredEquity - 0.01) {
    add(result, "equity", `הון עצמי מינימלי: ${Math.round(requiredEquity).toLocaleString("he-IL")} ₪ (${Math.round(minEqPct * 100)}% משווי הנכס).`);
  }

  const loan = computeLoanAmountNew(data);
  const limitPct = financingLimitPct(data.loanType, data.propertySource);
  let maxLoan = data.propertyValue * limitPct;
  if (data.loanType === "all_purpose") maxLoan = Math.max(0, data.propertyValue * 0.5 - data.existingMortgageBalance);
  if (loan > maxLoan + 0.01) add(result, "loan_amount", `סכום המשכנתא חורג ממגבלת המימון (${Math.round(maxLoan).toLocaleString("he-IL")} ₪).`);

  data.borrowers.forEach((b, i) => {
    if (!b.fullName.trim()) add(result, `borrowers[${i}].full_name`, "שם מלא נדרש.");
    if (!b.birthDate) add(result, `borrowers[${i}].birth_date`, "תאריך לידה נדרש.");
    else if (ageOnDate(new Date(b.birthDate), on) < MIN_BORROWER_AGE) add(result, `borrowers[${i}].birth_date`, "גיל מינימלי ללווה: 18.");
  });

  const oldest = oldestBorrowerAge(data.borrowers, on);
  if (oldest !== null && oldest > maxAge) add(result, "borrowers", `גיל הלווה המבוגר (${oldest}) חורג מגיל ${maxAge}.`);

  const net = netIncomeForCapacity(data.borrowers, data.additionalIncome, data.fixedExpenses);
  const cap = maxAllowedPayment(net, paymentRatio);
  if (data.desiredMinPayment <= 0 || data.desiredMaxPayment <= 0) add(result, "desired_payment", "יש להזין טווח תשלום חודשי רצוי.");
  else if (data.desiredMinPayment > data.desiredMaxPayment) add(result, "desired_payment", "מינימום התשלום חייב להיות קטן מהמקסימום.");
  else if (data.desiredMaxPayment > cap + 0.01) add(result, "desired_max_payment", `מקסימום תשלום (${Math.round(data.desiredMaxPayment).toLocaleString("he-IL")} ₪) חורג מכושר החזר (${Math.round(cap).toLocaleString("he-IL")} ₪, ${Math.round(paymentRatio * 100)}%).`);

  let maxTerm = MAX_MORTGAGE_TERM_YEARS;
  if (oldest !== null) maxTerm = Math.min(maxTerm, Math.max(0, maxAge - oldest));
  if (maxTerm < 4) add(result, "borrowers", "תקופת המשכנתא המקסימלית קצרה מדי לפי גיל הלווה.");

  result.computed = {
    loan_amount: loan,
    financing_limit_pct: limitPct,
    net_income: net,
    max_payment_capacity: cap,
    max_term_years: maxTerm,
    payment_ratio_used: paymentRatio,
    max_age_used: maxAge,
    check_eligibility: data.loanType === "single_property" && data.propertySource !== "target_price",
  };
  return result;
}

export function validateRefinance(
  data: RefinanceInput,
  opts: { today?: Date; paymentRatio?: number; maxAge?: number } = {},
): ValidationResult {
  const on = opts.today ?? new Date();
  const paymentRatio = opts.paymentRatio ?? DEFAULT_PAYMENT_TO_INCOME_RATIO;
  const maxAge = opts.maxAge ?? DEFAULT_MAX_AGE_REFINANCE;
  const result = newResult();

  if (!data.borrowers.length) add(result, "borrowers", "יש להזין לפחות לווה אחד.");
  if (data.propertyValue <= 0) add(result, "property_value", "שווי הנכס חייב להיות חיובי.");
  if (data.existingRoutesBalance <= 0) add(result, "existing_routes_balance", "יש להזין יתרת משכנתא קיימת.");

  data.borrowers.forEach((b, i) => {
    if (!b.fullName.trim()) add(result, `borrowers[${i}].full_name`, "שם מלא נדרש.");
    if (!b.birthDate) add(result, `borrowers[${i}].birth_date`, "תאריך לידה נדרש.");
  });

  const oldest = oldestBorrowerAge(data.borrowers, on);
  if (oldest !== null && oldest > maxAge) add(result, "borrowers", `גיל הלווה המבוגר (${oldest}) חורג מגיל ${maxAge}.`);

  const net = netIncomeForCapacity(data.borrowers, data.additionalIncome, data.fixedExpenses);
  const cap = maxAllowedPayment(net, paymentRatio);

  let minPay = data.desiredMinPayment;
  let maxPay = data.desiredMaxPayment;
  if (!data.adjustPayment) {
    minPay = cap * 0.85;
    maxPay = cap;
  } else if (minPay <= 0 || maxPay <= 0) add(result, "desired_payment", "יש להזין טווח תשלום חודשי רצוי.");
  else if (minPay > maxPay) add(result, "desired_payment", "מינימום התשלום חייב להיות קטן מהמקסימום.");
  else if (maxPay > cap + 0.01) add(result, "desired_max_payment", `מקסימום תשלום חורג מכושר החזר (${Math.round(cap).toLocaleString("he-IL")} ₪).`);

  let maxTerm = MAX_MORTGAGE_TERM_YEARS;
  if (oldest !== null) maxTerm = Math.min(maxTerm, Math.max(0, maxAge - oldest));

  result.computed = {
    loan_amount: data.existingRoutesBalance,
    net_income: net,
    max_payment_capacity: cap,
    min_pay: minPay,
    max_pay: maxPay,
    max_term_years: maxTerm,
    payment_ratio_used: paymentRatio,
    max_age_used: maxAge,
  };
  return result;
}
