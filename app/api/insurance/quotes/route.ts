// POST /api/insurance/quotes — BLOCKED until real tariff tables arrive (CLAUDE §8).
// Returns available:false with the insurer list; never fabricates premiums.
import { NextResponse } from "next/server";

const COMPANIES = ["הפניקס", "מגדל", "הראל", "כלל", "מנורה"];

export async function POST() {
  return NextResponse.json({
    available: false,
    companies: COMPANIES,
    quotes: [],
    note: "השוואת ביטוח משכנתא אינה זמינה עדיין — נדרשות טבלאות התעריפים (CLAUDE.md §8).",
  });
}
