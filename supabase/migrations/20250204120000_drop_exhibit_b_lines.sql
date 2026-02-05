-- Run after exhibit_b_revenues and exhibit_b_expenses are created and populated,
-- and the app has been switched to use them (County Revenues -> exhibit_b_revenues,
-- County Expenditures + Pie -> exhibit_b_expenses).

drop view if exists public.v_exhibit_b_lines_normalized;
drop table if exists public.exhibit_b_lines;
