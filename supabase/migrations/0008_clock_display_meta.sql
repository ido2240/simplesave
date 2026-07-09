-- Clock-template display metadata (D-2 rev. + D-6 resolution, 2026-07-06):
-- each mix gets a marketing subtitle and a display risk score (0-100) labelled
-- by fixed thresholds, decoupled from the engine risk (which must not change).
-- Manager-editable like the rest of the
-- template row; covered by the existing clock_templates RLS policies
-- (read: any authenticated user; write: admin only).

alter table public.clock_templates
  add column if not exists subtitle text,
  add column if not exists display_risk int
    check (display_risk is null or (display_risk between 0 and 100));
