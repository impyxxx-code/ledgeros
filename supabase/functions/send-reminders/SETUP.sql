-- ═══════════════════════════════════════════════════════════════
-- LedgerOS Auto-Reminder Setup
-- Run this SQL in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Step 1: Enable pg_cron extension (if not already enabled)
create extension if not exists pg_cron;

-- Step 2: Enable the http extension for calling edge functions
create extension if not exists http;

-- Step 3: Create the nightly cron job
-- Runs every day at 08:00 UTC (09:00 UK time in summer, 08:00 in winter)
select cron.schedule(
  'nightly-overdue-reminders',           -- job name
  '0 8 * * *',                           -- cron: every day at 08:00 UTC
  $$
  select
    net.http_post(
      url := 'https://szcogfyrhlrsxnwepnea.supabase.co/functions/v1/send-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Step 4: Verify the job was created
select * from cron.job where jobname = 'nightly-overdue-reminders';

-- ───────────────────────────────────────────────────────────────
-- To TEST immediately (dry run — no emails sent):
-- ───────────────────────────────────────────────────────────────
-- Call this from your browser or Postman:
-- POST https://szcogfyrhlrsxnwepnea.supabase.co/functions/v1/send-reminders
-- Header: Authorization: Bearer <your-service-role-key>
-- Body: { "dry_run": true }

-- ───────────────────────────────────────────────────────────────
-- To view cron job run history:
-- ───────────────────────────────────────────────────────────────
-- select * from cron.job_run_details order by start_time desc limit 20;

-- ───────────────────────────────────────────────────────────────
-- To disable/pause the job:
-- ───────────────────────────────────────────────────────────────
-- select cron.unschedule('nightly-overdue-reminders');

-- ───────────────────────────────────────────────────────────────
-- To change the time (e.g. 9am UTC):
-- ───────────────────────────────────────────────────────────────
-- select cron.unschedule('nightly-overdue-reminders');
-- Then re-run Step 3 with '0 9 * * *'
