export type NormalizedLine = {
  line_id: string;
  year: number;
  amount: number;
  row_kind: 'line_item' | 'subtotal' | 'total';
  category_norm: 'general_revenues' | 'program_revenues' | 'expenses' | 'net_position' | 'net_expense_revenue' | string;
  entity_norm: string;
  hierarchy_path_canon: string;
  hierarchy_path_norm: string;
  label: string;
  label_norm?: string | null;
  pdf_page_url: string;
};

/** Raw row from exhibit_b_lines table (matches Supabase schema). */
export type ExhibitBLineRow = {
  line_id: string;
  doc_id: string;
  display_order: number;
  doc_display_order: number;
  year: number;
  amount: number;
  row_kind: string;
  category_norm: string;
  entity_norm: string;
  hierarchy_path_canon: string;
  hierarchy_path_norm: string;
  label: string;
  label_norm?: string | null;
  pdf_page: number;
  storage_url: string | null;
};

/** Raw row from source_documents table (matches Supabase schema). */
export type SourceDocumentRow = {
  doc_id: string;
  storage_url: string | null;
};

/** Row from exhibit_b_lines used for expense/revenue totals (has label_norm). */
export type ExhibitBTotalRow = {
  line_id: string;
  doc_id: string;
  display_order: number;
  doc_display_order: number;
  year: number;
  amount: number;
  row_kind: string;
  category_norm: string;
  entity_norm: string;
  hierarchy_path_canon: string | null;
  hierarchy_path_norm: string | null;
  label: string | null;
  label_norm: string | null;
  pdf_page: number | null;
  storage_url: string | null;
};

/** Normalized totals row with pdf_page_url for charts. */
export type NormalizedTotalRow = {
  year: number;
  amount: number;
  category_norm: string;
  entity_norm: string;
  hierarchy_path_norm: string | null;
  label_norm: string | null;
  pdf_page_url: string;
};
