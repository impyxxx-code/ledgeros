-- ═══════════════════════════════════════════════════════════════
-- LedgerOS Auto-Reminder Setup (SendGrid)
-- Nightly cron that calls the send-reminders edge function, which emails
-- every overdue customer via SendGrid (from noreply@arkos.uk).
-- Run this in the Supabase SQL Editor AFTER deploying the function:
--   supabase functions deploy send-reminders --project-ref szcogfyrhlrsxnwepnea
--   supabase secrets set SENDGRID_API_KEY=<your_sendgrid_key> --project-ref szcogfyrhlrsxnwepnea
-- ═══════════════════════════════════════════════════════════════

-- Step 1: Extensions.
--   pg_cron  = the scheduler
--   pg_net   = async HTTP (provides net.http_post) — NOT the "http" extension
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Step 2: Store the key the cron uses to invoke the function, in Vault (encrypted).
-- The Supabase gateway requires a valid key in the Authorization header even
-- though the function itself uses its own service-role env key for DB access.
-- The ANON key is sufficient to invoke and is safe to store; paste yours below.
-- (Re-running create_secret errors if it exists — use the update line instead.)
select vault.create_secret('PASTE_YOUR_SUPABASE_ANON_KEY_HERE', 'reminders_invoke_key');
-- To change it later:
--   select vault.update_secret((select id from vault.secrets where name='reminders_invoke_key'), 'NEW_KEY');

-- Step 3: Schedule the nightly job (08:00 UTC = 09:00 UK during BST / 08:00 UK in winter).
select cron.schedule(
  'nightly-overdue-reminders',
  '0 8 * * *',
  $$
  select net.http_post(
    url     := 'https://szcogfyrhlrsxnwepnea.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_invoke_key')
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Step 4: Verify the job exists.
select jobid, jobname, schedule, active from cron.job where jobname = 'nightly-overdue-reminders';

-- ───────────────────────────────────────────────────────────────
-- TEST NOW (dry run — counts overdue invoices, sends NO emails):
--   select net.http_post(
--     url     := 'https://szcogfyrhlrsxnwepnea.supabase.co/functions/v1/send-reminders',
--     headers := jsonb_build_object('Content-Type','application/json',
--       'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='reminders_invoke_key')),
--     body    := '{"dry_run":true}'::jsonb
--   );
-- Then check the async response:
--   select id, status_code, content from net._http_response order by created desc limit 5;
--
-- CRON RUN HISTORY:
--   select * from cron.job_run_details order by start_time desc limit 20;
--
-- PAUSE / REMOVE:
--   select cron.unschedule('nightly-overdue-reminders');
--
-- CHANGE TIME (e.g. 09:00 UTC): unschedule, then re-run Step 3 with '0 9 * * *'.
-- ───────────────────────────────────────────────────────────────
