"use client";

// Per-document upload row: client-side size/type guard for a clean inline
// message, plus a pending state. The server action re-validates (never trust
// the client) and the 10MB cap is mirrored by next.config's bodySizeLimit.
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { uploadDocument } from "@/app/documents/actions";

const MAX_MB = 10;
const ALLOWED = ["application/pdf", "image/jpeg", "image/png"];

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-ghost press px-3.5 py-1.5 text-sm disabled:cursor-wait disabled:opacity-60">
      {pending ? "מעלה…" : label}
    </button>
  );
}

export default function DocUploadForm({ docId, kind, status }: { docId: string; kind: string; status: string }) {
  const [error, setError] = useState<string | null>(null);
  const [hasFile, setHasFile] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setError(null);
    setHasFile(!!f);
    if (!f) return;
    if (!ALLOWED.includes(f.type)) {
      setError("סוג קובץ לא נתמך — PDF, JPG או PNG בלבד.");
      e.target.value = "";
      setHasFile(false);
    } else if (f.size > MAX_MB * 1024 * 1024) {
      setError(`הקובץ גדול מ-${MAX_MB}MB. נסו קובץ קטן יותר.`);
      e.target.value = "";
      setHasFile(false);
    }
  }

  return (
    <form ref={formRef} action={uploadDocument.bind(null, docId)} className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <input
          type="file"
          name="file"
          required
          onChange={onFileChange}
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="max-w-[150px] text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-paper-2 file:px-2 file:py-1 file:text-xs"
          aria-label={`בחירת קובץ — ${kind}`}
        />
        <SubmitButton label={status === "לא הועלה" ? "העלה" : "החלף"} />
      </div>
      {error && <p className="text-xs font-semibold text-risk-high">{error}</p>}
      {hasFile && !error && <p className="text-[11px] text-ink-3">מוכן להעלאה</p>}
    </form>
  );
}
