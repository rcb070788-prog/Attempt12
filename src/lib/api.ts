import { supabase } from './supabaseClient';
import type { NormalizedLine, ExhibitBLineRow, SourceDocumentRow, ExhibitBTotalRow, NormalizedTotalRow } from './types';

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

const EXPENSE_TOTAL_LABEL_NORMS = [
  'total_governmental_activities',
  'total_business_type_activities',
  'total_component_unit',
  'total_component_units',
] as const;

const TOTALS_ROW_COLS =
  'line_id,doc_id,display_order,doc_display_order,year,amount,row_kind,category_norm,entity_norm,hierarchy_path_canon,hierarchy_path_norm,label,label_norm,pdf_page,storage_url';

/**
 * Fetch expense total/subtotal rows (Total Governmental, Total Business-type, Total Component Unit(s))
 * for the County Expenditures chart. Uses label_norm for stable matching.
 */
export async function fetchExhibitBExpenseTotals(): Promise<NormalizedTotalRow[]> {
  const { data: lines, error: linesError } = await supabase
    .from('exhibit_b_lines')
    .select(TOTALS_ROW_COLS)
    .eq('category_norm', 'expenses')
    .in('row_kind', ['subtotal', 'total'])
    .in('label_norm', [...EXPENSE_TOTAL_LABEL_NORMS])
    .order('year', { ascending: true })
    .order('display_order', { ascending: true });

  if (linesError) throw linesError;
  const rows = (lines ?? []) as ExhibitBTotalRow[];
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
      year: r.year,
      amount: Number(r.amount),
      category_norm: r.category_norm,
      entity_norm: r.entity_norm,
      hierarchy_path_norm: r.hierarchy_path_norm ?? null,
      label_norm: r.label_norm ?? null,
      pdf_page_url,
    };
  });
}

/**
 * Fetch revenue total rows for the County Revenues chart: (1) General Revenues total per entity,
 * (2) Program Revenues totals (Total Governmental, Total Business-type, Total Component Unit(s)).
 * Uses hierarchy_path_norm for general, label_norm for program.
 */
export async function fetchExhibitBRevenueTotals(): Promise<NormalizedTotalRow[]> {
  const GENERAL_TOTAL_PATH = 'general_revenues_total_general_revenues';

  const [generalRes, programRes] = await Promise.all([
    supabase
      .from('exhibit_b_lines')
      .select(TOTALS_ROW_COLS)
      .eq('category_norm', 'general_revenues')
      .eq('hierarchy_path_norm', GENERAL_TOTAL_PATH)
      .in('row_kind', ['subtotal', 'total'])
      .order('year', { ascending: true })
      .order('display_order', { ascending: true }),
    supabase
      .from('exhibit_b_lines')
      .select(TOTALS_ROW_COLS)
      .eq('category_norm', 'program_revenues')
      .in('row_kind', ['subtotal', 'total'])
      .in('label_norm', [...EXPENSE_TOTAL_LABEL_NORMS])
      .order('year', { ascending: true })
      .order('display_order', { ascending: true }),
  ]);

  if (generalRes.error) throw generalRes.error;
  if (programRes.error) throw programRes.error;

  const rows = [
    ...((generalRes.data ?? []) as ExhibitBTotalRow[]),
    ...((programRes.data ?? []) as ExhibitBTotalRow[]),
  ];
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
      year: r.year,
      amount: Number(r.amount),
      category_norm: r.category_norm,
      entity_norm: r.entity_norm,
      hierarchy_path_norm: r.hierarchy_path_norm ?? null,
      label_norm: r.label_norm ?? null,
      pdf_page_url,
    };
  });
}
