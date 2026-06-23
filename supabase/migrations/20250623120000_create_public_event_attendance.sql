-- Public meeting events and attendee sign-in (separate from profiles / voter_registry)

CREATE TABLE public_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  event_date date NOT NULL,
  location text,
  is_open boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public_events(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  district text,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX event_attendees_event_email_unique
  ON event_attendees (event_id, lower(email));

ALTER TABLE public_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

-- public_events: anon can read open events (for sign-in page)
CREATE POLICY "Public read open events"
  ON public_events
  FOR SELECT
  TO anon, authenticated
  USING (is_open = true);

-- public_events: admins can read all events
CREATE POLICY "Admins can select all events"
  ON public_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- public_events: admins can create events
CREATE POLICY "Admins can insert events"
  ON public_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- public_events: admins can update events (e.g. close sign-ins)
CREATE POLICY "Admins can update events"
  ON public_events
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- event_attendees: anyone can sign in to an open event
CREATE POLICY "Allow insert for event sign-in"
  ON event_attendees
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public_events e
      WHERE e.id = event_id AND e.is_open = true
    )
  );

-- event_attendees: admins can read all sign-ins
CREATE POLICY "Admins can select event attendees"
  ON event_attendees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

INSERT INTO public_events (slug, title, event_date, is_open)
VALUES ('2026-06-23', 'Public Meeting - June 23, 2026', '2026-06-23', true);
