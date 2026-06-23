#!/usr/bin/env node
/**
 * Fetches recent BLS CPI-U monthly data (CUUR0000SA0) and merges updates into CPI_ANNUAL_AVG in:
 *   - src/constants.ts
 *   - public/dashboards/expenses/expensesbyfund/index.html
 *
 * The BLS public API returns at most 20 monthly observations per request, so this script
 * fetches the latest window and updates:
 *   - completed years when all 12 monthly values are present
 *   - the current calendar year as a partial-year average (available months only)
 *
 * Existing years are preserved unless a full 12-month average can be computed from BLS.
 *
 * Usage: node scripts/update-cpi.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONSTANTS_PATH = join(ROOT, 'src', 'constants.ts');
const INDEX_HTML_PATH = join(ROOT, 'public', 'dashboards', 'expenses', 'expensesbyfund', 'index.html');
const SERIES_ID = 'CUUR0000SA0';

const currentYear = new Date().getFullYear();
const fetchStartYear = currentYear - 2;

function parseExistingCpiFromTs(src) {
  const match = src.match(/export const CPI_ANNUAL_AVG: Record<number, number> = \{([\s\S]*?)\};/);
  if (!match) throw new Error('CPI_ANNUAL_AVG block not found in src/constants.ts');
  const annual = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^\s*(\d{4}):\s*([\d.]+)/);
    if (m) annual[Number(m[1])] = Number(m[2]);
  }
  return annual;
}

async function fetchRecentMonthlyCpi() {
  const url = `https://api.bls.gov/publicAPI/v2/timeseries/data/${SERIES_ID}?startyear=${fetchStartYear}&endyear=${currentYear}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`BLS API HTTP ${res.status}`);
  const json = await res.json();
  if (json.status !== 'REQUEST_SUCCEEDED') {
    throw new Error(`BLS API error: ${JSON.stringify(json.message ?? json)}`);
  }
  const byYear = new Map();
  for (const row of json.Results?.series?.[0]?.data ?? []) {
    if (!row.period?.startsWith('M')) continue;
    const value = Number(row.value);
    if (!Number.isFinite(value)) continue;
    const year = Number(row.year);
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(value);
  }
  return byYear;
}

function mergeAnnualAverages(existing, byYear) {
  const merged = { ...existing };
  for (const [year, values] of byYear.entries()) {
    if (!values.length) continue;
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const rounded = Math.round(avg * 1000) / 1000;
    if (year < currentYear && values.length < 12) {
      console.log(`  skip ${year}: only ${values.length} months (need 12 for completed year)`);
      continue;
    }
    merged[year] = rounded;
    const note = year === currentYear ? `partial (${values.length} months)` : values.length < 12 ? `${values.length} months` : 'annual';
    console.log(`  update ${year}: ${rounded} [${note}]`);
  }
  return merged;
}

function formatTsObject(annual) {
  const entries = Object.entries(annual).sort((a, b) => Number(a[0]) - Number(b[0]));
  return entries
    .map(([year, value], i) => {
      const isLast = i === entries.length - 1;
      const isPartial = Number(year) === currentYear;
      if (isPartial) {
        return `  // Partial-year estimate: mean of available monthly CPI-U (${SERIES_ID})\n  ${year}: ${value}`;
      }
      return `  ${year}: ${value}${isLast ? '' : ','}`;
    })
    .join('\n');
}

function formatHtmlObject(annual) {
  const entries = Object.entries(annual).sort((a, b) => Number(a[0]) - Number(b[0]));
  return entries
    .map(([year, value], i) => {
      const isLast = i === entries.length - 1;
      const isPartial = Number(year) === currentYear;
      const suffix = isPartial
        ? ` // partial-year estimate: mean of available monthly CPI-U (${SERIES_ID})`
        : isLast
          ? ''
          : ',';
      return `  ${year}: ${value}${suffix}`;
    })
    .join('\n');
}

function updateConstantsTs(annual) {
  const src = readFileSync(CONSTANTS_PATH, 'utf8');
  const body = formatTsObject(annual);
  const next = src.replace(
    /export const CPI_ANNUAL_AVG: Record<number, number> = \{[\s\S]*?\};/,
    `export const CPI_ANNUAL_AVG: Record<number, number> = {\n${body}\n};`
  );
  if (next === src) throw new Error('Failed to update src/constants.ts');
  writeFileSync(CONSTANTS_PATH, next, 'utf8');
}

function updateIndexHtml(annual) {
  const src = readFileSync(INDEX_HTML_PATH, 'utf8');
  const body = formatHtmlObject(annual);
  const next = src.replace(
    /const CPI_ANNUAL_AVG = \{[\s\S]*?\};/,
    `const CPI_ANNUAL_AVG = {\n${body}\n};`
  );
  if (next === src) throw new Error('Failed to update index.html');
  writeFileSync(INDEX_HTML_PATH, next, 'utf8');
}

async function main() {
  const existing = parseExistingCpiFromTs(readFileSync(CONSTANTS_PATH, 'utf8'));
  console.log(`Fetching recent ${SERIES_ID} from BLS (${fetchStartYear}–${currentYear})...`);
  const byYear = await fetchRecentMonthlyCpi();
  const annual = mergeAnnualAverages(existing, byYear);

  updateConstantsTs(annual);
  updateIndexHtml(annual);
  console.log('Updated:', CONSTANTS_PATH);
  console.log('Updated:', INDEX_HTML_PATH);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
