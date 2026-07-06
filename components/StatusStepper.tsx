// The mockup's 8-step journey stepper (client personal area).
import type { StageStep } from "@/lib/stage";

export default function StatusStepper({ steps }: { steps: StageStep[] }) {
  return (
    <ol className="grid grid-cols-4 gap-y-4 sm:grid-cols-8" aria-label="שלבי התהליך">
      {steps.map((s, i) => (
        <li key={s.label} className="relative flex flex-col items-center">
          {i > 0 && (
            <span
              aria-hidden
              className="absolute right-1/2 top-[15px] -z-0 h-[3px] w-full"
              style={{ background: s.done || s.current ? "var(--refi, #15976A)" : "var(--rule)" }}
            />
          )}
          <span
            className={`z-10 flex h-[30px] w-[30px] items-center justify-center rounded-full text-[13px] font-bold ${
              s.done
                ? "bg-[#15976A] text-white"
                : s.current
                  ? "border-[2.5px] border-primary bg-white text-primary"
                  : "border-2 border-rule-strong bg-white text-ink-3"
            }`}
            aria-current={s.current ? "step" : undefined}
          >
            {s.done ? "✓" : i + 1}
          </span>
          <span className={`mt-2 text-center text-[11.5px] leading-tight ${s.current ? "font-bold text-primary" : s.done ? "font-medium text-ink-2" : "text-ink-3"}`}>
            {s.label}
          </span>
        </li>
      ))}
    </ol>
  );
}
