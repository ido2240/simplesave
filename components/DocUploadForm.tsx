"use client";

// Per-document upload row: client-side size/type guard for a clean inline
// message, pending state, and inline server result (error or ✓ success) via
// useActionState. The server action re-validates (never trust the client) and
// the 10MB cap is mirrored by next.config's bodySizeLimit.
import { useActionState, useState } from "react";
import { uploadDocument } from "@/app/documents/actions";

const MAX_MB = 10;
const ALLOWED = ["application/pdf", "image/jpeg", "image/png"];

export default function DocUploadForm({ docId, kind, status }: { docId: string; kind: string; status: string }) {
  const [state, formAction, pending] = useActionState(uploadDocument.bind(null, docId), null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [hasFile, setHasFile] = useState(false);
  const error = clientError ?? (state?.error || null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setClientError(null);
    setHasFile(!!f);
    if (!f) return;
    if (!ALLOWED.includes(f.type)) {
      setClientError("סוג קובץ לא נתמך — PDF, JPG או PNG בלבד.");
      e.target.value = "";
      setHasFile(false);
    } else if (f.size > MAX_MB * 1024 * 1024) {
      setClientError(`הקובץ גדול מ-${MAX_MB}MB. נסו קובץ קטן יותר.`);
      e.target.value = "";
      setHasFile(false);
    }
  }

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <input
          type="file"
          name="file"
          required
          disabled={pending}
          onChange={onFileChange}
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="max-w-[150px] text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-paper-2 file:px-2 file:py-1 file:text-xs"
          aria-label={`בחירת קובץ — ${kind}`}
        />
        <button type="submit" disabled={pending} className="btn-ghost press px-3.5 py-1.5 text-sm disabled:cursor-wait disabled:opacity-60">
          {pending ? "מעלה…" : status === "לא הועלה" ? "העלה" : "החלף"}
        </button>
      </div>
      {error && !pending && <p className="text-xs font-semibold text-risk-high" role="alert">{error}</p>}
      {state?.ok && !pending && !clientError && <p className="text-xs font-semibold text-risk-low">✓ הקובץ הועלה בהצלחה</p>}
      {hasFile && !error && !pending && !state?.ok && <p className="text-[11px] text-ink-3">מוכן להעלאה</p>}
    </form>
  );
}
