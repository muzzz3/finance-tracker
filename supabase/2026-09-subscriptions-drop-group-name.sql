-- DESTRUCTIVE — drops the deprecated `group_name` column from `subscriptions`.
--
-- Do NOT run this until:
--   1. You've run 2026-09-subscriptions-category-backfill.sql and confirmed
--      every subscription has the category you expect (via the verify
--      query at the bottom of that file, or just by looking at the
--      Recurring Payments page).
--   2. You've pulled the latest app code and confirmed the Recurring
--      Payments page works fully (category picker, grouping) without
--      group_name.
--
-- This is irreversible without a backup — take a Supabase database backup
-- first (Database -> Backups in the dashboard) if you want a rollback path.

alter table subscriptions drop column group_name;
