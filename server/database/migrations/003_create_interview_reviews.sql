BEGIN;

CREATE TABLE IF NOT EXISTS interview_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar(64) NOT NULL,
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  stage varchar(64) NOT NULL,
  interview_time timestamp,
  format varchar(32),
  interviewer varchar(255),
  overall_feeling integer,
  raw_notes text,
  questions jsonb,
  went_well text,
  improvements text,
  company_signals text,
  next_actions jsonb,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by user_profile DEFAULT (
    CASE
      WHEN current_setting('app.user_id', TRUE) = '' THEN NULL
      ELSE concat('(', current_setting('app.user_id', TRUE), ')')::user_profile
    END
  ),
  _updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by user_profile DEFAULT (
    CASE
      WHEN current_setting('app.user_id', TRUE) = '' THEN NULL
      ELSE concat('(', current_setting('app.user_id', TRUE), ')')::user_profile
    END
  )
);

COMMENT ON COLUMN interview_reviews.questions IS '@type InterviewReviewQuestion[]';
COMMENT ON COLUMN interview_reviews.next_actions IS '@type InterviewReviewNextAction[]';

ALTER TABLE interview_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_bypass_policy ON interview_reviews
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY authenticated_modify_own_policy ON interview_reviews
  AS PERMISSIVE FOR ALL TO authenticated
  USING (user_id = current_setting('app.user_id', TRUE))
  WITH CHECK (user_id = current_setting('app.user_id', TRUE));

CREATE POLICY authenticated_read_own_policy ON interview_reviews
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (user_id = current_setting('app.user_id', TRUE));

CREATE POLICY anon_denied_policy ON interview_reviews
  AS PERMISSIVE FOR SELECT TO anon USING (false);

CREATE INDEX IF NOT EXISTS idx_interview_reviews_user_id
  ON interview_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_reviews_application_id
  ON interview_reviews(application_id);

COMMIT;
