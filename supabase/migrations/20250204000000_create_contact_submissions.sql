-- Contact Us form submissions (Option B: Contact Inbox in Admin Portal)
CREATE TABLE contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  comment text NOT NULL,
  email text,
  phone text,
  created_at timestamptz DEFAULT now()
);

-- RLS: Allow anyone to insert (contact form is public)
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert for contact form"
  ON contact_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admins can select (read) contact submissions
CREATE POLICY "Admins can select contact submissions"
  ON contact_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
