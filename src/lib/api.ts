import { supabase } from './supabaseClient';
import type { NormalizedLine } from './types';

const COLS = 'line_id,year,amount,row_kind,category_norm,entity_norm,hierarchy_path_canon,hierarchy_path_norm,label,pdf_page_url';

export async function fetchNormalizedLines(): Promise<NormalizedLine[]> {
  const { data, error } = await supabase
    .from('v_exhibit_b_lines_normalized')
    .select(COLS)
    .eq('row_kind', 'line_item')
    .in('category_norm', ['general_revenues', 'program_revenues', 'expenses'])
    .order('year', { ascending: true });

  if (error) throw error;
  return (data ?? []) as NormalizedLine[];
}
