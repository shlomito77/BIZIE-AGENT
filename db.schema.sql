-- BIZIE production schema (Vercel Postgres)

CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  email text,
  birthday date,
  join_date timestamptz NOT NULL,
  last_visit timestamptz NOT NULL,
  visits_count int NOT NULL DEFAULT 0,
  total_spent numeric NOT NULL DEFAULT 0,
  notes text,
  preferences text[] NOT NULL DEFAULT '{}',
  source text NOT NULL,
  marketing_consent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  service_id text NOT NULL,
  start_time timestamptz NOT NULL,
  status text NOT NULL,
  google_event_id text,
  duration_minutes int NOT NULL DEFAULT 60,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS appointments_start_time_idx
ON appointments (start_time);

CREATE INDEX IF NOT EXISTS appointments_customer_phone_idx
ON appointments (customer_phone);

CREATE TABLE IF NOT EXISTS social_threads (
  id uuid PRIMARY KEY,
  platform text NOT NULL,
  external_id text,
  sender_name text NOT NULL,
  type text NOT NULL,
  is_processed boolean NOT NULL DEFAULT false,
  chat_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_message_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS social_threads_platform_external_idx
ON social_threads (platform, external_id);

CREATE INDEX IF NOT EXISTS social_threads_last_message_idx
ON social_threads (last_message_at DESC);
