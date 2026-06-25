// POST /api/calculate — run the engine over a mix supplied as JSON.
import { NextResponse } from "next/server";
import { calcMix, mixRisk } from "@/lib/engine";
import { calculateSchema, toRoute } from "@/lib/api-schemas";

export async function POST(req: Request) {
  const parsed = calculateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body", issues: parsed.error.issues }, { status: 422 });
  }
  const routes = parsed.data.routes.map(toRoute);
  const params = parsed.data.params;
  const mix = calcMix(routes, params);
  const risk = mixRisk(routes);
  return NextResponse.json({
    mix: {
      firstPay: mix.firstPay, total: mix.total, interest: mix.interest, indexation: mix.indexation,
      principal: mix.principal, avgRate: mix.avgRate, avgYears: mix.avgYears, maxN: mix.maxN,
    },
    risk,
  });
}
