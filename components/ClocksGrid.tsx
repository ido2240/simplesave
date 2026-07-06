"use client";

// Clocks grid with mockup selection UX: choosing a card highlights it and a
// sticky bar offers the save-and-continue CTA (the mockup's post-selection
// register bar, adapted to our authenticated flow).
import { useState, useTransition } from "react";
import type { ClockCardData } from "@/lib/clock-card-data";
import { chooseClock } from "@/app/new-mortgage/clock/[id]/actions";
import ClockCard from "./ClockCard";

export default function ClocksGrid({ clocks }: { clocks: ClockCardData[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const chosen = clocks.find((c) => c.key === selected);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {clocks.map((c, i) => (
          <ClockCard
            key={c.key}
            clock={c}
            rank={i + 1}
            recommended={c.recommended}
            selected={selected === c.key}
            onChoose={(key) => setSelected((cur) => (cur === key ? null : key))}
          />
        ))}
      </div>

      {chosen && (
        <div className="anim-fade fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-white/95 px-5 py-4 shadow-[0_-12px_34px_-18px_rgba(20,40,90,0.35)] backdrop-blur">
          <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center justify-between gap-3">
            <p className="font-bold">
              בחרתם: <span className="text-primary">{chosen.nameHe}</span>
              <span className="mr-2 hidden text-sm font-medium text-ink-3 sm:inline">שמרו את הבחירה והמשיכו לאזור האישי — העלאת מסמכים והתקדמות מול הבנקים.</span>
            </p>
            <button
              disabled={pending}
              onClick={() => startTransition(() => chooseClock(chosen.key))}
              className="btn-primary press px-6 py-3 text-sm disabled:cursor-wait disabled:opacity-60"
            >
              {pending ? "שומר…" : "שמור והמשך לאזור האישי ←"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
