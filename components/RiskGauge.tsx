// Single-color semicircle risk gauge (no rainbow — one fill, per the spec).
import type { RiskResult } from "@/lib/engine/types";

const COLOR: Record<string, string> = {
  נמוכה: "var(--forest)",
  בינונית: "var(--ochre)",
  גבוהה: "var(--brick)",
  "גבוהה מאוד": "var(--brick)",
};

export default function RiskGauge({ risk, size = 120 }: { risk: RiskResult; size?: number }) {
  const r = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  // Map score 1..5 to a fraction of the 180° arc.
  const frac = Math.max(0, Math.min(1, (risk.score - 1) / 4));
  const color = COLOR[risk.label] ?? "var(--ink-3)";

  // Semicircle from 180° (left) to 0° (right).
  const arc = (from: number, to: number) => {
    const p = (deg: number) => {
      const rad = (Math.PI * deg) / 180;
      return [cx - r * Math.cos(rad), cy - r * Math.sin(rad)];
    };
    const [x1, y1] = p(from);
    const [x2, y2] = p(to);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };

  return (
    <svg width={size} height={size / 2 + 18} viewBox={`0 0 ${size} ${size / 2 + 18}`}>
      <path d={arc(0, 180)} fill="none" stroke="var(--rule)" strokeWidth={8} />
      <path d={arc(0, 180 * frac)} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" />
      <text x={cx} y={cy - 2} textAnchor="middle" className="num" style={{ fontSize: 22, fontWeight: 800, fill: "var(--ink)" }}>
        {risk.score.toFixed(1)}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" style={{ fontSize: 11, fill: color, fontWeight: 700 }}>
        {risk.label}
      </text>
    </svg>
  );
}
