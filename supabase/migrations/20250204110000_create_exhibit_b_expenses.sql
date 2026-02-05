-- exhibit_b_expenses: CSV-only schema (no normalized columns).
-- Mapping to NormalizedLine/NormalizedTotalRow is done in the API layer.
create table public.exhibit_b_expenses (
  line_id uuid not null default gen_random_uuid(),
  doc_id text not null,
  doc_display_order integer not null,
  year integer not null,
  exhibit_id text not null,
  category_raw text not null,
  hierarchy_path text not null,
  label text not null,
  amount bigint not null,
  file_name text null,
  storage_url text null,
  pdf_page integer not null,
  section text not null,
  row_kind text not null,
  entity text not null,
  constraint exhibit_b_expenses_pkey primary key (line_id),
  constraint exhibit_b_expenses_doc_order_unique unique (doc_id, doc_display_order),
  constraint exhibit_b_expenses_doc_id_fkey foreign key (doc_id) references source_documents (doc_id) on delete cascade,
  constraint exhibit_b_expenses_row_kind_chk check (
    row_kind in ('line_item', 'subtotal', 'total')
  )
);

create index exhibit_b_expenses_doc_idx on public.exhibit_b_expenses using btree (doc_id, doc_display_order);
create index exhibit_b_expenses_year_idx on public.exhibit_b_expenses using btree (year);
