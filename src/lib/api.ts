import { supabase } from '../../supabaseClient';
import type {
  NormalizedLine,
  ExhibitBLineRow,
  SourceDocumentRow,
  ExhibitBTotalRow,
  NormalizedTotalRow,
  ExhibitBRevenueRow,
  ExhibitBExpenseRow,
} from './types';

const PAGE_SIZE = 1000;

/**
 * Fetches all rows from a paginated Supabase query.
 * PostgREST defaults to 1000 rows; this loops until the full dataset is retrieved.
 */
async function fetchAllPages<T>(
  runQuery: (from: number, to: number) => Promise<{ data: unknown; error: unknown }>
): Promise<T[]> {
  const allRows: T[] = [];
  let offset = 0;
  let page: T[];
  do {
    const { data, error } = await runQuery(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    page = (data ?? []) as T[];
    allRows.push(...page);
    offset += PAGE_SIZE;
  } while (page.length === PAGE_SIZE);
  return allRows;
}

/** Derive normalized form for matching (e.g. label_norm, hierarchy_path_norm). CSV-only tables have no norm columns. */
function slugify(s: string): string {
  if (!s || typeof s !== 'string') return '';
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

const COLS = 'line_id,year,amount,row_kind,category_norm,entity_norm,hierarchy_path_canon,hierarchy_path_norm,label,pdf_page_url';

export async function fetchNormalizedLines(): Promise<NormalizedLine[]> {
  const { data, error } = await supabase
    .from('v_exhibit_b_lines_normalized')
    .select(COLS)
    // Exclude total rows (e.g. total_primary_government, component_unit) to avoid double-counting.
    .eq('row_kind', 'line_item')
    .in('category_norm', ['general_revenues', 'program_revenues', 'expenses'])
    .order('year', { ascending: true });

  if (error) throw error;
  return (data ?? []) as NormalizedLine[];
}

/** Columns for exhibit_b_lines (matches Supabase schema). */
const EXHIBIT_B_LINE_COLS = 'line_id,doc_id,display_order,doc_display_order,year,amount,row_kind,category_norm,entity_norm,hierarchy_path_canon,hierarchy_path_norm,label,label_norm,pdf_page,storage_url';

/**
 * Fetch line-level data from exhibit_b_lines (and source_documents when storage_url is null).
 * Returns NormalizedLine[] so revenueTransforms and expenseTransforms work unchanged.
 * pdf_page_url is built as storage_url + #page=N for click-to-source.
 */
export async function fetchExhibitBLines(): Promise<NormalizedLine[]> {
  if (!supabase) return [];
  const { data: lines, error: linesError } = await supabase
    .from('exhibit_b_lines')
    .select(EXHIBIT_B_LINE_COLS)
    .eq('row_kind', 'line_item')
    .in('category_norm', ['general_revenues', 'program_revenues', 'expenses'])
    .order('year', { ascending: true })
    .order('display_order', { ascending: true });

  if (linesError) throw linesError;
  const rows = (lines ?? []) as ExhibitBLineRow[];
  if (rows.length === 0) return [];

  const needDocUrls = rows.some((r) => r.storage_url == null || r.storage_url === '');
  let urlByDocId: Record<string, string> = {};
  if (needDocUrls) {
    const docIds = [...new Set(rows.map((r) => r.doc_id).filter(Boolean))];
    if (docIds.length > 0) {
      const { data: docs, error: docsError } = await supabase
        .from('source_documents')
        .select('doc_id,storage_url')
        .in('doc_id', docIds);
      if (!docsError && docs) {
        urlByDocId = (docs as SourceDocumentRow[]).reduce(
          (acc, d) => ({ ...acc, [d.doc_id]: d.storage_url ?? '' }),
          {} as Record<string, string>
        );
      }
    }
  }

  return rows.map((r) => {
    const storageUrl = (r.storage_url && r.storage_url.trim() !== '') ? r.storage_url : (urlByDocId[r.doc_id] ?? '');
    const pdf_page_url = storageUrl + (r.pdf_page ? `#page=${r.pdf_page}` : '');
    return {
      line_id: String(r.line_id),
      year: r.year,
      amount: Number(r.amount),
      row_kind: r.row_kind as NormalizedLine['row_kind'],
      category_norm: r.category_norm,
      entity_norm: r.entity_norm,
      hierarchy_path_canon: r.hierarchy_path_canon ?? '',
      hierarchy_path_norm: r.hierarchy_path_norm ?? '',
      label: r.label ?? '',
      label_norm: r.label_norm ?? null,
      pdf_page_url,
    };
  });
}

/** Columns for exhibit_b_revenues (CSV-only schema). */
const EXHIBIT_B_REVENUE_COLS =
  'line_id,doc_id,doc_display_order,year,exhibit_id,category_raw,hierarchy_path,label,amount,file_name,storage_url,pdf_page,section,row_kind,entity';

/**
 * Fetch revenue line-level data from exhibit_b_revenues (row_kind = 'line_item').
 * Maps CSV columns to NormalizedLine in code: section→category_norm, entity→entity_norm, hierarchy_path→hierarchy_path_canon.
 * Uses pagination to fetch all rows (PostgREST defaults to 1000-row limit).
 */
export async function fetchExhibitBRevenueLines(): Promise<NormalizedLine[]> {
  if (!supabase) return [];
  const rows = await fetchAllPages<ExhibitBRevenueRow>((from, to) =>
    supabase
      .from('exhibit_b_revenues')
      .select(EXHIBIT_B_REVENUE_COLS)
      .eq('row_kind', 'line_item')
      .order('year', { ascending: true })
      .order('doc_display_order', { ascending: true })
      .range(from, to)
  );
  if (rows.length === 0) return [];

  const needDocUrls = rows.some((r) => r.storage_url == null || r.storage_url === '');
  let urlByDocId: Record<string, string> = {};
  if (needDocUrls) {
    const docIds = [...new Set(rows.map((r) => r.doc_id).filter(Boolean))];
    if (docIds.length > 0) {
      const { data: docs, error: docsError } = await supabase
        .from('source_documents')
        .select('doc_id,storage_url')
        .in('doc_id', docIds);
      if (!docsError && docs) {
        urlByDocId = (docs as SourceDocumentRow[]).reduce(
          (acc, d) => ({ ...acc, [d.doc_id]: d.storage_url ?? '' }),
          {} as Record<string, string>
        );
      }
    }
  }

  return rows.map((r) => {
    const storageUrl =
      r.storage_url && r.storage_url.trim() !== '' ? r.storage_url : urlByDocId[r.doc_id] ?? '';
    const pdf_page_url = storageUrl + (r.pdf_page ? `#page=${r.pdf_page}` : '');
    const hierarchy_path_canon = r.hierarchy_path ?? '';
    const hierarchy_path_norm = slugify(hierarchy_path_canon);
    const label_norm = slugify(r.label ?? '');
    return {
      line_id: String(r.line_id),
      year: r.year,
      amount: Number(r.amount),
      row_kind: r.row_kind as NormalizedLine['row_kind'],
      category_norm: r.section,
      entity_norm: r.entity,
      hierarchy_path_canon,
      hierarchy_path_norm,
      label: r.label ?? '',
      label_norm: label_norm || null,
      pdf_page_url,
    };
  });
}

/**
 * Fetch revenue total/subtotal rows from exhibit_b_revenues (row_kind in 'subtotal','total').
 * Maps to NormalizedTotalRow; derives hierarchy_path_norm and label_norm in code for matching.
 * Uses pagination to fetch all rows (PostgREST defaults to 1000-row limit).
 */
async function fetchExhibitBRevenueTotalsFromTable(): Promise<NormalizedTotalRow[]> {
  if (!supabase) return [];
  const rows = await fetchAllPages<ExhibitBRevenueRow>((from, to) =>
    supabase
      .from('exhibit_b_revenues')
      .select(EXHIBIT_B_REVENUE_COLS)
      .in('row_kind', ['subtotal', 'total'])
      .order('year', { ascending: true })
      .order('doc_display_order', { ascending: true })
      .range(from, to)
  );
  if (rows.length === 0) return [];

  const needDocUrls = rows.some((r) => r.storage_url == null || r.storage_url === '');
  let urlByDocId: Record<string, string> = {};
  if (needDocUrls) {
    const docIds = [...new Set(rows.map((r) => r.doc_id).filter(Boolean))];
    if (docIds.length > 0) {
      const { data: docs, error: docsError } = await supabase
        .from('source_documents')
        .select('doc_id,storage_url')
        .in('doc_id', docIds);
      if (!docsError && docs) {
        urlByDocId = (docs as SourceDocumentRow[]).reduce(
          (acc, d) => ({ ...acc, [d.doc_id]: d.storage_url ?? '' }),
          {} as Record<string, string>
        );
      }
    }
  }

  return rows.map((r) => {
    const storageUrl =
      r.storage_url && r.storage_url.trim() !== '' ? r.storage_url : urlByDocId[r.doc_id] ?? '';
    const pdf_page_url = storageUrl + (r.pdf_page ? `#page=${r.pdf_page}` : '');
    const hierarchy_path_norm =
      r.section === 'general_revenues' && (r.row_kind === 'total' || r.label === 'Total General Revenues')
        ? slugify(r.hierarchy_path ?? '') + '_' + slugify(r.label ?? '')
        : slugify(r.hierarchy_path ?? '');
    const label_norm = slugify(r.label ?? '');
    return {
      year: r.year,
      amount: Number(r.amount),
      category_norm: r.section,
      entity_norm: r.entity,
      hierarchy_path_norm: hierarchy_path_norm || null,
      label_norm: label_norm || null,
      pdf_page_url,
    };
  });
}

/** Columns for exhibit_b_expenses (CSV-only schema). */
const EXHIBIT_B_EXPENSE_COLS =
  'line_id,doc_id,doc_display_order,year,exhibit_id,category_raw,hierarchy_path,label,amount,file_name,storage_url,pdf_page,section,row_kind,entity';

/**
 * Fetch expense line-level data from exhibit_b_expenses (row_kind = 'line_item').
 * Maps CSV columns to NormalizedLine: section→category_norm ('expenses'), entity→entity_norm.
 * Uses pagination to fetch all rows (PostgREST defaults to 1000-row limit).
 */
export async function fetchExhibitBExpenseLines(): Promise<NormalizedLine[]> {
  if (!supabase) return [];
  const rows = await fetchAllPages<ExhibitBExpenseRow>((from, to) =>
    supabase
      .from('exhibit_b_expenses')
      .select(EXHIBIT_B_EXPENSE_COLS)
      .eq('row_kind', 'line_item')
      .order('year', { ascending: true })
      .order('doc_display_order', { ascending: true })
      .range(from, to)
  );
  if (rows.length === 0) return [];

  const needDocUrls = rows.some((r) => r.storage_url == null || r.storage_url === '');
  let urlByDocId: Record<string, string> = {};
  if (needDocUrls) {
    const docIds = [...new Set(rows.map((r) => r.doc_id).filter(Boolean))];
    if (docIds.length > 0) {
      const { data: docs, error: docsError } = await supabase
        .from('source_documents')
        .select('doc_id,storage_url')
        .in('doc_id', docIds);
      if (!docsError && docs) {
        urlByDocId = (docs as SourceDocumentRow[]).reduce(
          (acc, d) => ({ ...acc, [d.doc_id]: d.storage_url ?? '' }),
          {} as Record<string, string>
        );
      }
    }
  }

  return rows.map((r) => {
    const storageUrl =
      r.storage_url && r.storage_url.trim() !== '' ? r.storage_url : urlByDocId[r.doc_id] ?? '';
    const pdf_page_url = storageUrl + (r.pdf_page ? `#page=${r.pdf_page}` : '');
    const hierarchy_path_canon = r.hierarchy_path ?? '';
    const hierarchy_path_norm = slugify(hierarchy_path_canon);
    const label_norm = slugify(r.label ?? '');
    return {
      line_id: String(r.line_id),
      year: r.year,
      amount: Number(r.amount),
      row_kind: r.row_kind as NormalizedLine['row_kind'],
      category_norm: 'expenses',
      entity_norm: r.entity,
      hierarchy_path_canon,
      hierarchy_path_norm,
      label: r.label ?? '',
      label_norm: label_norm || null,
      pdf_page_url,
    };
  });
}

const EXPENSE_TOTAL_LABEL_NORMS = [
  'total_governmental_activities',
  'total_business_type_activities',
  'total_component_unit',
  'total_component_units',
  'total_primary_government', // used for 2020 only (Governmental Activities total not reported)
  'metropolitan_school_department',
  'emergency_communications_district',
] as const;

const TOTALS_ROW_COLS =
  'line_id,doc_id,display_order,doc_display_order,year,amount,row_kind,category_norm,entity_norm,hierarchy_path_canon,hierarchy_path_norm,label,label_norm,pdf_page,storage_url';

/**
 * Fetch expense total/subtotal rows from exhibit_b_expenses (row_kind in 'subtotal','total').
 * Derives label_norm in code and filters to EXPENSE_TOTAL_LABEL_NORMS for chart matching.
 * Uses pagination to fetch all rows (PostgREST defaults to 1000-row limit).
 */
async function fetchExhibitBExpenseTotalsFromTable(): Promise<NormalizedTotalRow[]> {
  if (!supabase) return [];
  const rows = await fetchAllPages<ExhibitBExpenseRow>((from, to) =>
    supabase
      .from('exhibit_b_expenses')
      .select(EXHIBIT_B_EXPENSE_COLS)
      .in('row_kind', ['subtotal', 'total'])
      .order('year', { ascending: true })
      .order('doc_display_order', { ascending: true })
      .range(from, to)
  );
  if (rows.length === 0) return [];

  const needDocUrls = rows.some((r) => r.storage_url == null || r.storage_url === '');
  let urlByDocId: Record<string, string> = {};
  if (needDocUrls) {
    const docIds = [...new Set(rows.map((r) => r.doc_id).filter(Boolean))];
    if (docIds.length > 0) {
      const { data: docs, error: docsError } = await supabase
        .from('source_documents')
        .select('doc_id,storage_url')
        .in('doc_id', docIds);
      if (!docsError && docs) {
        urlByDocId = (docs as SourceDocumentRow[]).reduce(
          (acc, d) => ({ ...acc, [d.doc_id]: d.storage_url ?? '' }),
          {} as Record<string, string>
        );
      }
    }
  }

  const labelNormsSet = new Set(EXPENSE_TOTAL_LABEL_NORMS);
  return rows
    .map((r) => {
      const storageUrl =
        r.storage_url && r.storage_url.trim() !== '' ? r.storage_url : urlByDocId[r.doc_id] ?? '';
      const pdf_page_url = storageUrl + (r.pdf_page ? `#page=${r.pdf_page}` : '');
      const label_norm = slugify(r.label ?? '');
      return {
        year: r.year,
        amount: Number(r.amount),
        category_norm: 'expenses',
        entity_norm: r.entity,
        hierarchy_path_norm: slugify(r.hierarchy_path ?? '') || null,
        label_norm: label_norm || null,
        pdf_page_url,
      };
    })
    .filter((row) => row.label_norm != null && labelNormsSet.has(row.label_norm));
}

/**
 * Fetch expense total/subtotal rows for the County Expenditures chart from exhibit_b_expenses.
 */
export async function fetchExhibitBExpenseTotals(): Promise<NormalizedTotalRow[]> {
  return fetchExhibitBExpenseTotalsFromTable();
}

/**
 * Fetch revenue total rows for the County Revenues chart from exhibit_b_revenues.
 * (1) General Revenues total per entity, (2) Program Revenues totals.
 * hierarchy_path_norm and label_norm are derived in code from hierarchy_path/label.
 */
export async function fetchExhibitBRevenueTotals(): Promise<NormalizedTotalRow[]> {
  return fetchExhibitBRevenueTotalsFromTable();
}
