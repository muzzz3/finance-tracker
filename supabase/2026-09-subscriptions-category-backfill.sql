-- One-time backfill: unify subscription categorization onto `categories`.
-- Safe / additive — does not drop or alter any column, does not delete data.
-- Run this in the Supabase SQL editor whenever you're ready. Re-running it
-- is safe (idempotent).
--
-- Context: subscriptions currently carry both a `category_id` (FK into
-- categories) and a free-text `group_name`. The app code no longer reads
-- group_name (see the Subscriptions page changes in this same change set) —
-- this backfill migrates the group_name info into category_id so
-- category_id becomes the single source of truth, per the mapping reviewed
-- together:
--   "Credit Cards"      (3 subs, no category) -> new "Credit Cards" category
--   "Software & Tools"  (2 subs, split between "Entertainment"/"Software")
--                                              -> consolidated onto "Software"
--   "Home"               (3 subs, already on "Apartment Expenses")  -> no change needed
--   "Entertainment"       (2 subs, already on "Entertainment")       -> no change needed

-- 1. Create the "Credit Cards" expense category if it doesn't already exist.
insert into categories (user_id, name, type, color)
select user_id, 'Credit Cards', 'expense', '#94a3b8'
from categories
where not exists (
  select 1 from categories where name = 'Credit Cards' and type = 'expense'
)
limit 1;

-- 2. Point the "Credit Cards" group's subscriptions (currently uncategorized)
--    at the new category.
update subscriptions
set category_id = (select id from categories where name = 'Credit Cards' and type = 'expense' limit 1),
    updated_at = now()
where group_name = 'Credit Cards' and category_id is null;

-- 3. Reconcile the "Software & Tools" group onto the existing "Software"
--    category (one subscription was already there, one was miscategorized
--    under "Entertainment").
update subscriptions
set category_id = (select id from categories where name = 'Software' and type = 'expense' limit 1),
    updated_at = now()
where group_name = 'Software & Tools';

-- Verify the result — every row's `category` column should now be non-null
-- and reflect the correct bucket (Home -> Apartment Expenses, etc.):
select s.name, s.group_name, c.name as category
from subscriptions s
left join categories c on c.id = s.category_id
order by 1;
