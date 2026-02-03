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
  pdf_page_url: string;
};
