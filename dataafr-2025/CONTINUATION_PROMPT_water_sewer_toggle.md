# Continuation prompt — Include Water & Sewer toggle (County Revenues)

Copy everything below the line into a **new Cursor chat** (Agent mode) if further work is needed.

---

Continue Moore County AFR / finance app work (project: `c:\GitHub\Attempt12`).

## Already done (prior chats)

- **2025 Exhibit B revenues** — 81 rows in Supabase; Gen Gov = **$11,122,791**
- **Include Water & Sewer toggle** — UX clarified; chart line renamed to **Water & Sewer** (was MUD); helper text added
- Verification script: `scripts/verify_revenue_water_sewer_toggle.py`

## Reported issue (resolved)

Toggling **Include Water & Sewer** on County Revenues did not change **Gen Gov** — user expected an effect.

**Root cause:** Water & Sewer (enterprise fund) revenues are `business_type_activities` in Exhibit B, mapped to the **Water & Sewer** chart series and **Total**, not Gen Gov. Gen Gov = `governmental_activities` only.

## Expected toggle behavior (2025)

| Series | Toggle ON | Toggle OFF |
|--------|-----------|------------|
| Gen Gov | $11,122,791 | $11,122,791 (unchanged) |
| Water & Sewer | $4,773,734 | hidden |
| Schools | $12,452,165 | $12,452,165 |
| Total | $28,348,690 | $23,574,956 |

Verify:

```powershell
python scripts\verify_revenue_water_sewer_toggle.py
```

## Key files

- [`src/features/finance/CountyRevenues.tsx`](src/features/finance/CountyRevenues.tsx) — toggle UI, entity chart labels
- [`src/lib/revenueTransforms.ts`](src/lib/revenueTransforms.ts) — `getRevenueByEntityByYear()`
- [`src/features/finance/CountyRevenuesPiePage.tsx`](src/features/finance/CountyRevenuesPiePage.tsx) — pie toggle

## If revisiting

1. Confirm user wants Gen Gov to include enterprise fund (would be a data/model change, not toggle-only)
2. Align with [`RevenueDashboard.tsx`](src/features/finance/RevenueDashboard.tsx) `filterByEntity()` if pies and entity chart diverge
3. 2020: Water & Sewer line intentionally undefined (COVID / software upgrade)
