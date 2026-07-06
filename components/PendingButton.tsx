"use client";

import { useFormStatus } from "react-dom";

/** Submit button for server-action forms: disables itself and swaps to a
 *  pending label while the action round-trip is in flight, so slow actions
 *  (remote DB, cold starts) never leave the user staring at an inert page. */
export default function PendingButton({
  children,
  pendingLabel,
  className,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={`${className ?? ""} disabled:cursor-wait disabled:opacity-60`}>
      {pending ? pendingLabel : children}
    </button>
  );
}
