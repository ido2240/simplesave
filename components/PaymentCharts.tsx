"use client";

// Mix-detail charts per the mockup: cumulative payments (paid vs cumulative
// interest) and average monthly payment per year — both fed by the engine's
// real schedules via lib/schedule (never the mockup's flat annuity).
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CumulativePoint, MonthlyPoint } from "@/lib/schedule";

const fmt = (n: number) => `₪${Math.round(n).toLocaleString("he-IL")}`;
const kFmt = (v: number) => `${Math.round(v / 1000)}K`;
const axisTick = { fontSize: 11, fill: "var(--ink-3)" };
const tooltipStyle = {
  background: "var(--surface)", border: "1px solid var(--rule)", borderRadius: 12,
  fontSize: 12, boxShadow: "0 14px 34px -20px rgba(20,40,90,0.4)",
};

export function CumulativeChart({ data }: { data: CumulativePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="var(--rule)" strokeDasharray="2 3" vertical={false} />
        <XAxis dataKey="year" tick={axisTick} tickLine={false}
          label={{ value: "שנה", position: "insideBottomRight", offset: -2, fontSize: 11, fill: "var(--ink-3)" }} />
        <YAxis tickFormatter={kFmt} tick={axisTick} tickLine={false} width={46} />
        <Tooltip
          formatter={((v: number, name: string) => [fmt(Number(v)), name === "paid" ? "סה״כ שולם" : "מזה ריבית והצמדה"]) as never}
          labelFormatter={(y) => `שנה ${y}`}
          contentStyle={tooltipStyle}
        />
        <Line type="monotone" dataKey="paid" stroke="var(--primary)" strokeWidth={2.6} dot={false} />
        <Line type="monotone" dataKey="cumInterest" stroke="var(--risk-mid)" strokeWidth={2.6} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function MonthlyChart({ data }: { data: MonthlyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="var(--rule)" strokeDasharray="2 3" vertical={false} />
        <XAxis dataKey="year" tick={axisTick} tickLine={false} tickFormatter={(y) => `ש${y}`} />
        <YAxis tickFormatter={kFmt} tick={axisTick} tickLine={false} width={46} />
        <Tooltip
          formatter={((v: number) => [fmt(Number(v)), "החזר חודשי ממוצע"]) as never}
          labelFormatter={(y) => `שנה ${y}`}
          cursor={{ fill: "rgba(37,73,201,0.08)" }}
          contentStyle={tooltipStyle}
        />
        <Bar dataKey="monthly" fill="#3D62E0" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
