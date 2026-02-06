-- Wage Reports bucket for PDFs and CSVs in County Wages / School Wages (path prefixes)
INSERT INTO storage.buckets (id, name, public)
VALUES ('wage_reports', 'wage_reports', true)
ON CONFLICT (id) DO NOTHING;
