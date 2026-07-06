"use client";

// Visual mix-template editor (mockup 11b): per-track rows (kind / linked /
// share) up to 10 tracks, live share bars + donut, sum=100 validation.
import { useActionState, useState } from "react";
import { updateTemplate, type TemplateSaveState } from "@/app/admin/templates/actions";
import TrackDonut, { DONUT_COLORS } from "./TrackDonut";

export interface EditorTrack {
  kind: "fixed" | "variable" | "prime";
  linked: boolean;
  sharePct: number;
}

export interface EditorTemplate {
  id: string;
  name: string;
  subtitle: string;
  displayRisk: number;
  recommended: boolean;
  tracks: EditorTrack[];
}

const KIND_LABEL = { fixed: "קבועה", variable: "משתנה כל 5", prime: "פריים" } as const;
const MAX_TRACKS = 10;
const field = "w-full rounded-lg border border-rule-strong bg-paper px-2.5 py-1.5 text-sm outline-none focus:border-manager";

export default function TemplateEditor({ template }: { template: EditorTemplate }) {
  const [state, formAction, pending] = useActionState<TemplateSaveState | undefined, FormData>(
    updateTemplate.bind(null, template.id),
    undefined,
  );
  const [tracks, setTracks] = useState<EditorTrack[]>(template.tracks);
  const [displayRisk, setDisplayRisk] = useState(template.displayRisk);
  const sum = Math.round(tracks.reduce((s, t) => s + t.sharePct, 0));

  const setTrack = (i: number, patch: Partial<EditorTrack>) =>
    setTracks((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const addTrack = () =>
    setTracks((ts) => (ts.length >= MAX_TRACKS ? ts : [...ts, { kind: "fixed", linked: false, sharePct: 0 }]));
  const removeTrack = (i: number) =>
    setTracks((ts) => (ts.length <= 1 ? ts : ts.filter((_, j) => j !== i)));

  return (
    <form action={formAction} className="card rounded-2xl p-5">
      <div className="flex flex-wrap items-start gap-5">
        <div className="min-w-[260px] flex-1">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block"><span className="lbl mb-1 block">שם התמהיל</span>
              <input name="name" defaultValue={template.name} className={`${field} display text-lg font-bold`} /></label>
            <label className="block"><span className="lbl mb-1 block">כותרת משנה</span>
              <input name="subtitle" defaultValue={template.subtitle} className={field} /></label>
          </div>

          <p className="lbl mb-2 mt-4">מסלולים ({tracks.length}/{MAX_TRACKS})</p>
          <div className="space-y-2">
            {tracks.map((t, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2.5 rounded-xl border border-rule bg-paper p-2.5">
                <span className="h-3.5 w-3.5 shrink-0 rounded-[4px]" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                <select value={t.kind} onChange={(e) => setTrack(i, { kind: e.target.value as EditorTrack["kind"], linked: e.target.value === "prime" ? false : t.linked })} className={`${field} w-32`} aria-label={`סוג מסלול ${i + 1}`}>
                  {Object.entries(KIND_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <label className={`flex items-center gap-1.5 text-xs font-semibold ${t.kind === "prime" ? "opacity-40" : ""}`}>
                  <input type="checkbox" checked={t.linked} disabled={t.kind === "prime"} onChange={(e) => setTrack(i, { linked: e.target.checked })} className="accent-[var(--manager,#7A4FE0)]" /> צמוד מדד
                </label>
                <div className="flex items-center gap-1.5">
                  <input type="number" min={0} max={100} value={t.sharePct} onChange={(e) => setTrack(i, { sharePct: Number(e.target.value) || 0 })} className={`${field} num w-20`} aria-label={`אחוז מסלול ${i + 1}`} />
                  <span className="text-xs text-ink-3">%</span>
                </div>
                <div className="h-2 min-w-16 flex-1 overflow-hidden rounded-full bg-rule">
                  <div className="h-2 rounded-full" style={{ width: `${Math.min(100, t.sharePct)}%`, background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                </div>
                <button type="button" onClick={() => removeTrack(i)} disabled={tracks.length <= 1}
                  className="text-sm font-semibold text-risk-high hover:underline disabled:opacity-30">הסר</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addTrack} disabled={tracks.length >= MAX_TRACKS}
            className="btn-ghost press mt-2.5 px-3.5 py-1.5 text-sm disabled:opacity-40">+ הוסף מסלול</button>
        </div>

        <div className="flex flex-col items-center gap-2">
          <TrackDonut shares={tracks.map((t) => t.sharePct)} size={130} />
          <span className={`num text-xs font-bold ${sum === 100 ? "text-ink-3" : "text-risk-high"}`}>סכום: {sum}%</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-4">
        <label className="flex flex-1 items-center gap-3 text-sm">
          <span className="lbl whitespace-nowrap">סיכון מוצג</span>
          <input type="range" min={0} max={100} value={displayRisk} onChange={(e) => setDisplayRisk(Number(e.target.value))} className="max-w-56 flex-1 accent-[var(--manager,#7A4FE0)]" aria-label="סיכון מוצג (0-100)" />
          <span className="num w-8 font-bold">{displayRisk}</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="recommended" defaultChecked={template.recommended} className="accent-[var(--manager,#7A4FE0)]" /> מומלץ ★
        </label>
        <input type="hidden" name="tracks" value={JSON.stringify(tracks)} />
        <input type="hidden" name="display_risk" value={displayRisk} />
        <div className="flex items-center gap-3">
          {state?.error && <span className="text-sm font-semibold text-risk-high">{state.error}</span>}
          {state?.saved && !state.error && <span className="text-sm font-semibold text-refi">✓ נשמר</span>}
          <button disabled={pending || sum !== 100}
            className="press rounded-lg bg-manager px-5 py-2 text-sm font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
            {pending ? "שומר…" : "שמור"}
          </button>
        </div>
      </div>
    </form>
  );
}
