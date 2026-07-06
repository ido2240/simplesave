// POST /api/insurance/quotes — demo-tariff comparison (owner-approved
// 2026-07-06). Every response is flagged demo:true: the factors are the
// mockup's illustrative estimates, NOT live insurer quotes. Swap the factors
// for real tariff tables when provided — the shape stays the same.
import { NextResponse } from "next/server";
import { RATE_LIMIT_MESSAGE, rateLimitOk } from "@/lib/rate-limit";
import { z } from "zod";

const N_MONTHS = 300;
const AVG_FACTOR = 0.63;

const INSURERS = [
  { name: "הראל", rating: 4.6, factor: 0.000395 },
  { name: "הפניקס", rating: 4.5, factor: 0.000412 },
  { name: "מנורה מבטחים", rating: 4.4, factor: 0.000428 },
  { name: "מגדל", rating: 4.3, factor: 0.000447 },
  { name: "כלל ביטוח", rating: 4.1, factor: 0.000465 },
];

const bodySchema = z.object({ sum: z.number().positive().max(100_000_000) });

export async function POST(req: Request) {
  if (!(await rateLimitOk({ name: "api-ins", limit: 30, windowMs: 60_000 }))) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "יש לשלוח sum חיובי (יתרת המשכנתא לביטוח)." }, { status: 400 });
  }
  const { sum } = parsed.data;
  const quotes = INSURERS
    .map((c) => {
      const first = sum * c.factor;
      const avg = first * AVG_FACTOR;
      return { name: c.name, rating: c.rating, firstPremium: first, avgPremium: avg, totalPremium: avg * N_MONTHS };
    })
    .sort((a, b) => a.totalPremium - b.totalPremium);
  return NextResponse.json({
    available: true,
    demo: true,
    note: "תעריפי הדגמה משוערים בלבד — לא הצעות מחיר של חברות הביטוח.",
    months: N_MONTHS,
    quotes,
  });
}
