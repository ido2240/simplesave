// POST /api/new-mortgage/clocks — validate a questionnaire and return 5 clocks.
import { NextResponse } from "next/server";
import { DEFAULT_PAYMENT_TO_INCOME_RATIO, generateAllClocks, validateNewMortgage } from "@/lib/engine";
import { newMortgageSchema } from "@/lib/api-schemas";

const RATIO = Number(process.env.PAYMENT_TO_INCOME_RATIO || DEFAULT_PAYMENT_TO_INCOME_RATIO);
const MAX_AGE = Number(process.env.MAX_AGE_NEW_MORTGAGE || 85);

export async function POST(req: Request) {
  const parsed = newMortgageSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body", issues: parsed.error.issues }, { status: 422 });
  }
  const { params, ...q } = parsed.data;
  const validation = validateNewMortgage(q, { paymentRatio: RATIO, maxAge: MAX_AGE });
  if (!validation.ok) {
    return NextResponse.json({ validation, clocks: [] });
  }
  const loan = Number(validation.computed.loan_amount);
  const clocks = generateAllClocks({ loan, minPay: q.desiredMinPayment, maxPay: q.desiredMaxPayment, params });
  return NextResponse.json({
    validation,
    clocks: clocks.map((c) => ({
      key: c.key, name: c.nameHe, duplicateFlag: c.duplicateFlag, inRange: c.tune.inRange,
      mix: { firstPay: c.mix.firstPay, total: c.mix.total, interest: c.mix.interest, indexation: c.mix.indexation },
      risk: c.risk,
      routes: c.routes.map((r) => ({ kind: r.kind, sharePct: r.sharePct, years: r.years, anchor: r.anchor, margin: r.margin, indexType: r.indexType })),
    })),
  });
}
