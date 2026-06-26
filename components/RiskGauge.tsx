// Three-color needle gauge (green → amber → red), per the Claude Design source.
import type { RiskResult } from "@/lib/engine/types";

const COLOR: Record<string, string> = {
  נמוכה: "var(--risk-low)",
  בינונית: "var(--risk-mid)",
  גבוהה: "var(--risk-high)",
  "גבוהה מאוד": "var(--risk-high)",
};

// Polar point in the design's coordinate space (y flipped for screen).
function pol(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
}

function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const [x1, y1] = pol(cx, cy, r, from);
  const [x2, y2] = pol(cx, cy, r, to);
  return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
}

export default function RiskGauge({
  risk,
  size = 120,
  showLabel = true,
}: {
  risk: RiskResult;
  size?: number;
  showLabel?: boolean;
}) {
  const cx = 80, cy = 84, r = 60, sw = 13;
  const color = COLOR[risk.label] ?? "var(--ink-3)";

  // Map our 1..5 score onto the design's 0..100 sweep.
  const score100 = Math.max(0, Math.min(100, ((risk.score - 1) / 4) * 100));
  const ang = 180 - score100 * 1.8;
  const deg = 90 - ang; // needle base points straight up; rotate to target

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={(size * 104) / 160} viewBox="0 0 160 104">
        <path d={arc(cx, cy, r, 180, 116)} stroke="var(--risk-low)" strokeWidth={sw} fill="none" strokeLinecap="round" />
        <path d={arc(cx, cy, r, 112, 68)} stroke="var(--risk-mid)" strokeWidth={sw} fill="none" strokeLinecap="round" />
        <path d={arc(cx, cy, r, 64, 0)} stroke="var(--risk-high)" strokeWidth={sw} fill="none" strokeLinecap="round" />
        <g style={{ transform: `rotate(${deg}deg)`, transformOrigin: `${cx}px ${cy}px` }}>
          <line x1={cx} y1={cy} x2={cx} y2={cy - (r - 13)} stroke="var(--ink)" strokeWidth={4} strokeLinecap="round" />
        </g>
        <circle cx={cx} cy={cy} r={7} fill="var(--ink)" />
        <circle cx={cx} cy={cy} r={3} fill="#fff" />
      </svg>
      {showLabel && (
        <div className="-mt-1 text-center text-[13px] font-bold" style={{ color }}>
          סיכון {risk.label}
        </div>
      )}
    </div>
  );
}
