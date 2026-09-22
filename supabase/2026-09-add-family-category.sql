-- Add a "Family" expense category with one child per family member, using
-- the same parent/child pattern Food already uses (see schema.sql). Safe /
-- additive -- only inserts new category rows, doesn't touch any existing
-- category, transaction, or subscription.
--
-- Colors are chosen to be distinct from every existing category color (see
-- 2026-09-standardize-category-colors.sql) and from the dashboard's
-- hardcoded 401k/Roth/Stocks/Paycheck Savings/Subscriptions slice colors.
--
-- Re-running this is safe: if "Family" already exists, the WHERE NOT EXISTS
-- guard means the parent insert returns no row, so the child insert (which
-- depends on it) is a no-op too.

WITH parent AS (
  INSERT INTO categories (user_id, name, type, color)
  SELECT (SELECT user_id FROM categories LIMIT 1), 'Family', 'expense', '#9f1239'
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Family' AND type = 'expense')
  RETURNING id, user_id
)
INSERT INTO categories (user_id, name, type, parent_id, color)
SELECT parent.user_id, v.name, 'expense', parent.id, v.color
FROM parent, (VALUES
  ('Azfar', '#3b82f6'),
  ('Hazim', '#f59e0b'),
  ('Faazilah', '#10b981'),
  ('Dayya', '#ec4899'),
  ('Mom', '#78350f')
) AS v(name, color);

-- Verify:
select c.name as family_member, c.color
from categories c
join categories p on p.id = c.parent_id
where p.name = 'Family' and p.type = 'expense'
order by c.name;
