-- Corrects colors from 2026-09-standardize-category-colors.sql and
-- 2026-09-add-family-category.sql. Those picked colors that were merely
-- hex-distinct, not perceptually distinct -- e.g. Hazim (#f59e0b) and
-- Outside Food (#fb923c) were different hex codes that render as the same
-- color at small-dot size. This set was generated and checked with the
-- dataviz skill's OKLab-based validator (scripts/validate_palette.js)
-- instead of picked by eye.
--
-- With 15 categories needing new colors, perfect (>=15 OKLab ΔE) separation
-- for every single pair isn't mathematically achievable -- even this app's
-- own reference palette (8 hues) can't clear that bar past 3 colors under
-- all-pairs testing. Worst pair here is ΔE 12.0 (Home Goods vs Outdoor
-- Activities) and 13.0 among the Family children -- both a real, visible
-- difference, just short of colorblind-safe. Fine as-is unless you actually
-- have colorblindness, in which case say so and we can cut categories
-- instead of colors to get a better guarantee.
--
-- Safe / additive -- only updates the `color` column. Re-running is safe
-- (idempotent, matches by exact name).

update categories set color = '#0575c4' where name = 'Car' and type = 'expense';
update categories set color = '#04a68e' where name = 'Home Goods' and type = 'expense';
update categories set color = '#a98c26' where name = 'Apartment Expenses' and type = 'expense';
update categories set color = '#ce174d' where name = 'Wasted :(' and type = 'expense';
update categories set color = '#de5df6' where name = 'Clothing & Accessories' and type = 'expense';
update categories set color = '#bbca09' where name = 'Health' and type = 'expense';
update categories set color = '#339920' where name = 'Outdoor Activities' and type = 'expense';
update categories set color = '#b914b0' where name = 'Software' and type = 'expense';
update categories set color = '#a465a7' where name = 'Vacation' and type = 'expense';
update categories set color = '#586d03' where name = 'Family' and type = 'expense' and parent_id is null;
update categories set color = '#7a43ef' where name = 'Azfar' and type = 'expense';
update categories set color = '#10d231' where name = 'Hazim' and type = 'expense';
update categories set color = '#2cdcaf' where name = 'Faazilah' and type = 'expense';
update categories set color = '#d5a8f8' where name = 'Dayya' and type = 'expense';
update categories set color = '#7281fb' where name = 'Mom' and type = 'expense';

-- Verify -- every row should have a color, no two should match exactly:
select name, color, count(*) over (partition by color) as sharing_this_color
from categories
order by color;
