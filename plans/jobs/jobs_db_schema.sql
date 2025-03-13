CREATE TABLE IF NOT EXISTS monday_users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL
);


CREATE TABLE IF NOT EXISTS monday_jobs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  user_id UUID REFERENCES monday_users(id) ON DELETE CASCADE,
  details JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS idx_monday_jobs_email ON monday_jobs(email);


CREATE INDEX IF NOT EXISTS idx_monday_jobs_user_id ON monday_jobs(user_id);


CREATE INDEX IF NOT EXISTS idx_monday_jobs_details ON monday_jobs USING GIN (details);


CREATE TABLE IF NOT EXISTS monday_jobs_sync (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  user_id UUID REFERENCES monday_users(id) ON DELETE CASCADE,
  last_cursor TEXT,
  has_more BOOLEAN DEFAULT FALSE,
  last_sync_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_jobs INTEGER DEFAULT 0,


  CONSTRAINT unique_sync_user_email UNIQUE(user_id, email)
);


CREATE INDEX IF NOT EXISTS idx_monday_jobs_sync_email ON monday_jobs_sync(email);


CREATE INDEX IF NOT EXISTS idx_monday_jobs_sync_user_id ON monday_jobs_sync(user_id);


CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER update_monday_jobs_updated_at
BEFORE UPDATE ON monday_jobs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();