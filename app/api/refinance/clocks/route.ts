// POST /api/refinance/clocks — 5 alternative mixes for an existing balance.
import { NextResponse } from "next/server";
import { RATE_LIMIT_MESSAGE, rateLimitOk } from "@/lib/rate-limit";
import { generateAllClocks } from "@/lib/engine";
import { refinanceSchema } from "@/lib/api-schemas";

export async function POST(req: Request) {
  if (!(await rateLimitOk({ name: "api-refi", limit: 30, windowMs: 60_000 }))) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }
  const parsed = refinanceSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body", issues: parsed.error.issues }, { status: 422 });
  }
  const { existingRoutesBalance, desiredMinPayment, desiredMaxPayment, params } = parsed.data;
  const clocks = generateAllClocks({ loan: existingRoutesBalance, minPay: desiredMinPayment, maxPay: desiredMaxPayment, params });
  return NextResponse.json({
    clocks: clocks.map((c) => ({
      key: c.key, name: c.nameHe, inRange: c.tune.inRange,
      mix: { firstPay: c.mix.firstPay, total: c.mix.total, interest: c.mix.interest, indexation: c.mix.indexation },
      risk: c.risk,
    })),
  });
}
