BEGIN;

CREATE INDEX IF NOT EXISTS idx_applications_user_updated_at
  ON applications (user_id, updated_at DESC);

COMMIT;
