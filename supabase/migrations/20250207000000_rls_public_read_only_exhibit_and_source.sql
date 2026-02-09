-- RLS: Public read-only for exhibit_b_revenues, exhibit_b_expenses, source_documents.
-- No INSERT/UPDATE/DELETE policies => only service_role can write.

-- exhibit_b_revenues
ALTER TABLE public.exhibit_b_revenues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read-only: exhibit_b_revenues"
  ON public.exhibit_b_revenues
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- exhibit_b_expenses
ALTER TABLE public.exhibit_b_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read-only: exhibit_b_expenses"
  ON public.exhibit_b_expenses
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- source_documents (referenced by exhibit_b_* and used in api.ts)
ALTER TABLE public.source_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read-only: source_documents"
  ON public.source_documents
  FOR SELECT
  TO anon, authenticated
  USING (true);
