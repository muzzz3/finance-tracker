-- Standardize category colors so each category is visually unique across
-- the app, and none collide with the hardcoded slice colors the dashboard
-- uses for 401k (#a78bfa), Roth IRA (#8b5cf6), Stocks (#60a5fa), Paycheck
-- Savings (#34d399), or the Subscriptions catch-all (#38bdf8) -- those
-- appear in the same Income Allocation donut as your expense categories.
--
-- Safe / additive -- only updates the `color` column, no rows added or
-- removed. Re-running it is safe (idempotent, matches by exact name).
--
-- Kept as-is (already fine): Food family (orange shades), Entertainment
-- (pink), Credit Cards (gray).
-- Fixed: Car and Home Goods collided with Stocks/401k above. Apartment
-- Expenses collided with Paycheck Savings. Wasted :( collided with Credit
-- Cards. The rest had no color set at all.

update categories set color = '#6366f1' where name = 'Car' and type = 'expense';                  -- indigo (was same blue as Stocks)
update categories set color = '#2dd4bf' where name = 'Home Goods' and type = 'expense';            -- teal (was same purple as 401k)
update categories set color = '#06b6d4' where name = 'Apartment Expenses' and type = 'expense';    -- cyan (was same green as Paycheck Savings)
update categories set color = '#b45309' where name = 'Wasted :(' and type = 'expense';             -- amber-brown (was same gray as Credit Cards)
update categories set color = '#d946ef' where name = 'Clothing & Accessories' and type = 'expense';
update categories set color = '#facc15' where name = 'Health' and type = 'expense';
update categories set color = '#84cc16' where name = 'Outdoor Activities' and type = 'expense';
update categories set color = '#78716c' where name = 'Parking' and type = 'expense';
update categories set color = '#dc2626' where name = 'Software' and type = 'expense';
update categories set color = '#fb7185' where name = 'Vacation' and type = 'expense';

-- Verify -- every row should now have a color, and every color should be unique:
select name, color, count(*) over (partition by color) as sharing_this_color
from categories
order by color;
