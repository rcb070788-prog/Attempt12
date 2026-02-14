
export interface DashboardConfig {
  id: string;
  title: string;
  category: 'expenses' | 'revenues' | 'assets';
  description: string;
  folderPath: string; // The URL path to the index.html inside the dashboard folder
}

export interface Poll {
  id: string;
  title: string;
  description: string;
  openDate: string;
  closeDate: string;
  isAnonymousAllowed: boolean;
  status: 'open' | 'closed';
}

export interface Vote {
  id: string;
  pollId: string;
  voterId: string;
  voterName: string;
  district: string;
  voteValue: string;
  isAnonymous: boolean;
}

export interface Comment {
  id: string;
  pollId: string;
  voterName: string;
  district: string;
  content: string;
  createdAt: string;
}

export interface Suggestion {
  id: string;
  voterName: string;
  district: string;
  content: string;
  isPublic: boolean;
  createdAt: string;
}

export interface UserProfile {
  fullName: string;
  voterId: string;
  district: string;
  email: string;
  phone: string;
  contactPreference: 'email' | 'text' | 'both';
  isAdmin?: boolean;
}

export interface DocumentSectionConfig {
  id: string;
  title: string;
  description?: string;
  children?: { id: string; title: string }[];
  storagePath?: string;
}

/* --- Finance/Data types (from src/lib/types.ts) --- */

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

/** Raw row from exhibit_b_revenues table (CSV-only schema). */
export type ExhibitBRevenueRow = {
  line_id: string;
  doc_id: string;
  doc_display_order: number;
  year: number;
  exhibit_id: string;
  category_raw: string;
  hierarchy_path: string;
  label: string;
  amount: number;
  file_name: string | null;
  storage_url: string | null;
  pdf_page: number;
  section: string;
  row_kind: string;
  entity: string;
};

/** Raw row from exhibit_b_expenses table (CSV-only schema). */
export type ExhibitBExpenseRow = {
  line_id: string;
  doc_id: string;
  doc_display_order: number;
  year: number;
  exhibit_id: string;
  category_raw: string;
  hierarchy_path: string;
  label: string;
  amount: number;
  file_name: string | null;
  storage_url: string | null;
  pdf_page: number;
  section: string;
  row_kind: string;
  entity: string;
};
