-- LedgerOS usage analytics — run these in Supabase SQL editor
-- (audit_log columns assumed: id, created_at, user_id, action, entity_type, entity_id, details)

-- 1) Action volume per user, with role
select p.full_name, p.role, a.action, count(*) as cnt
from audit_log a
join profiles p on p.id = a.user_id
group by p.full_name, p.role, a.action
order by p.role, cnt desc;

-- 2) Daily activity per user (last 30 days)
select p.full_name, date(a.created_at) as day, count(*) as actions
from audit_log a
join profiles p on p.id = a.user_id
where a.created_at > now() - interval '30 days'
group by p.full_name, day
order by day desc, actions desc;

-- 3) Login frequency / last seen per user
select p.full_name, p.role,
       count(*) filter (where a.action = 'user_login') as login_count,
       max(a.created_at) as last_login
from audit_log a
join profiles p on p.id = a.user_id
group by p.full_name, p.role
order by last_login desc;

-- 4) Busiest hours of day (24h, server time) — useful for spotting mobile vs desk usage windows
select extract(hour from created_at) as hour_of_day, count(*) as actions
group by hour_of_day
order by hour_of_day;

-- 5) Payment activity per agent (who's collecting most)
select p.full_name,
       count(*) filter (where a.action in ('payment_received','part_payment','bulk_payment')) as payments_recorded
from audit_log a
join profiles p on p.id = a.user_id
group by p.full_name
order by payments_recorded desc;

-- 6) Most common action overall (what features get used most)
select action, count(*) as cnt
from audit_log
group by action
order by cnt desc;
