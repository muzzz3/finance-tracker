-- Add a "Business" expense category (flat, no sub-categories -- per user
-- request, can add children later the same way Family/Food do).
--
-- Color chosen by the same OKLab-distance method as the other 2026-09-*
-- color migrations (dataviz skill's validate_palette.js): #b54f05 sits at
-- least 11.9 ΔE from every other category and dashboard-reserved color
-- currently in use.
--
-- Safe / additive -- only inserts one new category row. Re-running this is
-- safe: the WHERE NOT EXISTS guard means it's a no-op if "Business" already
-- exists.

INSERT INTO categories (user_id, name, type, color)
SELECT (SELECT user_id FROM categories LIMIT 1), 'Business', 'expense', '#b54f05'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Business' AND type = 'expense');

-- Verify:
select name, color from categories where name = 'Business' and type = 'expense';
