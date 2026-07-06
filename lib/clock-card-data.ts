// Light, serializable projection of a computed clock for client components —
// the full ClockResult carries the entire per-month schedules (hundreds of
// numbers per route) and must stay on the server.
import type { ClockWithMeta } from "./engine-config";

export interface ClockCardData {
  key: string;
  nameHe: string;
  subtitle: string | null;
  duplicateFlag: string | null;
  displayRisk: number;
  recommended: boolean;
  firstPay: number;
  total: number;
  costSide: number; // interest + indexation
  principalPct: number;
  routes: { kind: string; sharePct: number; indexed: boolean }[];
}

export function toClockCardData(c: ClockWithMeta): ClockCardData {
  const m = c.mix;
  return {
    key: c.key,
    nameHe: c.nameHe,
    subtitle: c.subtitle,
    duplicateFlag: c.duplicateFlag,
    displayRisk: c.displayRisk,
    recommended: c.recommended,
    firstPay: m.firstPay,
    total: m.total,
    costSide: m.interest + m.indexation,
    principalPct: m.total > 0 ? m.principal / m.total : 0,
    routes: c.routes.map((rt) => ({ kind: rt.kind ?? "fixed", sharePct: rt.sharePct, indexed: rt.indexType === "מדד" })),
  };
}
