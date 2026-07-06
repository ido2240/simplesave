// Track-composition donut, per the mockup (SVG, no chart lib needed).
// Supports up to 10 slices — the manager template editor's track cap.

export const DONUT_COLORS = [
  "#2549C9", "#5C7BE6", "#A9BCF2", "#7A4FE0", "#A07CEC",
  "#1FA0A0", "#7DD3C0", "#D9820B", "#F0C36A", "#C24C8E",
];

function pol(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
}

export default function TrackDonut({
  shares,
  size = 140,
  centerTop = "תמהיל",
  centerBottom,
}: {
  shares: number[];
  size?: number;
  centerTop?: string;
  centerBottom?: string;
}) {
  const cx = 70, cy = 70, R = 58, r = 36;
  const total = shares.reduce((s, v) => s + v, 0) || 1;
  let acc = 0;
  const segs = shares.map((v, i) => {
    if (v <= 0) return null;
    const a0 = (acc / total) * 360;
    const a1 = ((acc + v) / total) * 360;
    acc += v;
    const large = a1 - a0 > 180 ? 1 : 0;
    // Guard the full-circle case (single 100% slice) — arcs need two points.
    const end = a1 - a0 >= 359.99 ? a1 - 0.01 : a1;
    const [x0, y0] = pol(cx, cy, R, 90 - a0);
    const [x1, y1] = pol(cx, cy, R, 90 - end);
    const [ix1, iy1] = pol(cx, cy, r, 90 - end);
    const [ix0, iy0] = pol(cx, cy, r, 90 - a0);
    return (
      <path
        key={i}
        d={`M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${ix1} ${iy1} A ${r} ${r} 0 ${large} 0 ${ix0} ${iy0} Z`}
        fill={DONUT_COLORS[i % DONUT_COLORS.length]}
      />
    );
  });
  const bottom = centerBottom ?? `${shares.filter((v) => v > 0).length} מסלולים`;

  return (
    <svg width={size} height={size} viewBox="0 0 140 140" role="img" aria-label={`הרכב תמהיל: ${bottom}`}>
      {segs}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={13} fill="var(--ink-3)">{centerTop}</text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize={16} fontWeight={700} fill="var(--ink)">{bottom}</text>
    </svg>
  );
}
