import type { ReactNode } from "react";

const GRADIENT: Record<string, string> = {
  client: "linear-gradient(115deg,#16265a,#22409b)",
  advisor: "linear-gradient(115deg,#0c4a35,#15976a)",
  manager: "linear-gradient(115deg,#3a2270,#7a4fe0)",
};

/** Gradient banner header for the role dashboards (client / advisor / manager). */
export default function DashHeader({
  eyebrow,
  title,
  variant = "client",
  children,
}: {
  eyebrow: string;
  title: string;
  variant?: keyof typeof GRADIENT;
  children?: ReactNode;
}) {
  return (
    <div style={{ background: GRADIENT[variant] }}>
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-5 px-5 py-9 text-white sm:px-7">
        <div>
          <div className="text-sm font-medium text-white/75">{eyebrow}</div>
          <h1 className="display mt-1.5 text-3xl font-bold sm:text-4xl">{title}</h1>
        </div>
        {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
      </div>
    </div>
  );
}

/** Glassy stat tile for inside a DashHeader. */
export function DashStat({ label, value, accent }: { label: string; value: ReactNode; accent?: string }) {
  return (
    <div className="rounded-2xl border border-white/16 bg-white/10 px-5 py-3.5 text-center">
      <div className="text-xs text-white/70">{label}</div>
      <div className="display mt-0.5 text-2xl font-bold" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
    </div>
  );
}
