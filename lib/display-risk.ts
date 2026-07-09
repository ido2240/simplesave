// Display-risk layer (D-6, resolved 2026-07-06): each clock template carries a
// manager-editable 0-100 display score, labelled with fixed thresholds. The
// engine risk stays untouched and available internally; this module only
// translates scores to user-facing labels/colors.
import type { RiskResult } from "@/lib/engine";

/** Mockup riskLabel(): <35 low, <50 low-mid, <65 mid, <78 mid-high, else high. */
export function displayRiskLabel(score: number): string {
  return score < 35 ? "נמוך" : score < 50 ? "נמוך-בינוני" : score < 65 ? "בינוני" : score < 78 ? "בינוני-גבוה" : "גבוה";
}

/** Mockup riskColor(): green <50, amber <72, red above — as CSS variables. */
export function displayRiskColor(score: number): string {
  return score < 50 ? "var(--risk-low)" : score < 72 ? "var(--risk-mid)" : "var(--risk-high)";
}

/** Fallback when a template has no display_risk: map the engine's ~1..5 score
 *  onto the 0-100 sweep (same mapping the gauge used before this layer). */
export function engineRiskTo100(risk: RiskResult): number {
  return Math.max(0, Math.min(100, ((risk.score - 1) / 4) * 100));
}
