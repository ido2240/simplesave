"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface YearPoint {
  year: number;
  principal: number;
  interest: number;
}

const fmt = (n: number) => `₪${Math.round(n).toLocaleString("he-IL")}`;

export default function AmortizationChart({ data }: { data: YearPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="var(--rule)" strokeDasharray="2 3" vertical={false} />
        <XAxis dataKey="year" tick={{ fontSize: 11, fill: "var(--ink-3)" }} tickLine={false}
          label={{ value: "שנה", position: "insideBottomRight", offset: -2, fontSize: 11, fill: "var(--ink-3)" }} />
        <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 11, fill: "var(--ink-3)" }} tickLine={false} width={42} />
        <Tooltip
          formatter={((v: number, name: string) => [fmt(Number(v)), name === "principal" ? "קרן" : "ריבית/הצמדה"]) as never}
          labelFormatter={(y) => `שנה ${y}`}
          contentStyle={{ background: "var(--surface)", border: "1px solid var(--rule)", borderRadius: 12, fontSize: 12, boxShadow: "0 14px 34px -20px rgba(20,40,90,0.4)" }}
        />
        <Area type="monotone" dataKey="interest" stackId="1" stroke="var(--risk-mid)" fill="var(--risk-mid)" fillOpacity={0.22} />
        <Area type="monotone" dataKey="principal" stackId="1" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.35} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
