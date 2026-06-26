// zod request schemas for the headless API (the TypeScript analogue of the
// Pydantic models in the Python api/schemas.py).
import { z } from "zod";
import { blankRoute, type Route } from "./engine";

export const paramsSchema = z.object({
  cpi: z.number().default(0.03),
  usd: z.number().default(0.03),
  eur: z.number().default(0.015),
});

export const routeInputSchema = z.object({
  amount: z.number().nonnegative(),
  years: z.number().positive(),
  anchor: z.number(),
  margin: z.number().default(0),
  board: z.enum(["שפיצר", "קרן שווה"]).default("שפיצר"),
  balloon: z.enum(["", "בלון מלא", "בלון חלקי", "גרייס מלא", "גרייס חלקי"]).default(""),
  balloonMonths: z.number().default(0),
  indexType: z.enum(["", "ללא", "מדד", "דולר", "אירו"]).default("ללא"),
  indexPct: z.number().default(1),
  kind: z.enum(["fixed", "variable", "prime"]).nullable().default(null),
  rateType: z.enum(["", "קבועה", "משתנה"]).default("קבועה"),
  anchorType: z.enum(["", "פריים", 'פק"מ', 'אג"ח']).default(""),
  changeMonths: z.number().default(0),
  sharePct: z.number().default(0),
  yearStep: z.number().default(0),
});

export function toRoute(input: z.infer<typeof routeInputSchema>): Route {
  return blankRoute({ ...input, indexPct: input.indexType === "מדד" ? input.indexPct : input.indexType === "ללא" ? 0 : input.indexPct });
}

export const calculateSchema = z.object({
  routes: z.array(routeInputSchema).min(1).max(10),
  params: paramsSchema.default({ cpi: 0.03, usd: 0.03, eur: 0.015 }),
});

const borrowerSchema = z.object({
  fullName: z.string().default(""),
  birthDate: z.string().nullable().default(null),
  isPropertyOwner: z.boolean().default(true),
  netIncome: z.number().nonnegative().default(0),
});

export const newMortgageSchema = z.object({
  loanType: z.enum(["single_property", "additional_property", "all_purpose", "improvement"]),
  propertySource: z.enum(["contractor", "second_hand", "target_price", "self_build"]),
  propertyValue: z.number().positive(),
  equity: z.number().nonnegative(),
  borrowers: z.array(borrowerSchema).min(1).max(5),
  additionalIncome: z.number().nonnegative().default(0),
  fixedExpenses: z.number().nonnegative().default(0),
  desiredMinPayment: z.number().nonnegative(),
  desiredMaxPayment: z.number().nonnegative(),
  existingMortgageBalance: z.number().nonnegative().default(0),
  params: paramsSchema.default({ cpi: 0.03, usd: 0.03, eur: 0.015 }),
});

export const refinanceSchema = z.object({
  existingRoutesBalance: z.number().positive(),
  desiredMinPayment: z.number().positive(),
  desiredMaxPayment: z.number().positive(),
  params: paramsSchema.default({ cpi: 0.03, usd: 0.03, eur: 0.015 }),
});
