BEGIN;

CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar(64) NOT NULL,
  company varchar(255) NOT NULL,
  position varchar(255) NOT NULL,
  location varchar(64),
  industry varchar(64),
  functions text,
  channel varchar(64),
  favorite_time timestamp,
  apply_time timestamp,
  status varchar(64) DEFAULT '收藏',
  next_step varchar(255),
  notes text,
  resume_tag varchar(128),
  resume_file_id varchar(255),
  job_description text,
  board_order integer,
  job_responsibilities text,
  job_requirements text,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_at timestamp(3) with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by user_profile DEFAULT (
    CASE
      WHEN current_setting('app.user_id', TRUE) = '' THEN NULL
      ELSE concat('(', current_setting('app.user_id', TRUE), ')')::user_profile
    END
  ),
  _updated_at timestamp(3) with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by user_profile DEFAULT (
    CASE
      WHEN current_setting('app.user_id', TRUE) = '' THEN NULL
      ELSE concat('(', current_setting('app.user_id', TRUE), ')')::user_profile
    END
  )
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_bypass_policy ON applications
  TO service_role USING (true);

CREATE POLICY authenticated_modify_all_policy ON applications
  AS PERMISSIVE FOR ALL TO authenticated USING (true);

CREATE POLICY public_read_policy ON applications
  AS PERMISSIVE FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY owner_modify_policy ON applications
  AS PERMISSIVE FOR ALL TO authenticated USING (
    (current_setting('app.user_id'::text) = ANY (ARRAY[]::text[]))
    AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text)
  );

CREATE INDEX IF NOT EXISTS idx_applications_user_id
  ON applications (user_id);

CREATE INDEX IF NOT EXISTS idx_applications_user_created_at
  ON applications (user_id, created_at DESC);

COMMIT;
