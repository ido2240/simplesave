const ils = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 0,
});

/** Format a number as ₪ with no decimals. */
export function shekel(n: number): string {
  return ils.format(Math.round(n));
}

/** Compact percentage, e.g. 0.0462 → "4.62%". */
export function pct(fraction: number, digits = 2): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}
