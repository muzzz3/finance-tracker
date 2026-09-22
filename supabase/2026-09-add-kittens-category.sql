-- Add a "Kittens" expense category with a child per expense type, same
-- parent/child pattern as Food and Family. Safe / additive -- only inserts
-- new category rows, doesn't touch anything existing.
--
-- Colors picked with the same OKLab-distance method as the other 2026-09-*
-- color migrations (dataviz skill's validate_palette.js), checked against
-- all 27 colors already in use across categories and the dashboard's
-- hardcoded investment slices. Worst pairwise separation among these 9 new
-- colors is ΔE 11.0 -- consistent with the ~10-13 ceiling already reached
-- with this many categories total (see 2026-09-refine-category-colors.sql).
--
-- Re-running this is safe: if "Kittens" already exists, the WHERE NOT
-- EXISTS guard means the parent insert returns no row, so the child insert
-- (which depends on it) is a no-op too.

WITH parent AS (
  INSERT INTO categories (user_id, name, type, color)
  SELECT (SELECT user_id FROM categories LIMIT 1), 'Kittens', 'expense', '#ce6f75'
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Kittens' AND type = 'expense')
  RETURNING id, user_id
)
INSERT INTO categories (user_id, name, type, parent_id, color)
SELECT parent.user_id, v.name, 'expense', parent.id, v.color
FROM parent, (VALUES
  ('Wet Food', '#5dcdfa'),
  ('Dry Food', '#fa2c7e'),
  ('Vet', '#2ba8f2'),
  ('Litter', '#7db144'),
  ('Insurance', '#2a5dfa'),
  ('Toys & Enrichment', '#b484e8'),
  ('Grooming', '#ff9cb3'),
  ('Pet Sitting / Boarding', '#a84fda')
) AS v(name, color);

-- Verify:
select c.name as kitten_expense, c.color
from categories c
join categories p on p.id = c.parent_id
where p.name = 'Kittens' and p.type = 'expense'
order by c.name;
