-- ============================================================
-- Delta AI — Tool Reviews
-- Migration 004: Community ratings and pros/cons per tool
-- ============================================================

-- ---- Reviews table ----
CREATE TABLE IF NOT EXISTS tool_reviews (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id     uuid        NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  rating      smallint    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  pros        text[]      DEFAULT '{}',
  cons        text[]      DEFAULT '{}',
  use_case    text,
  verified    boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tool_id, user_id)
);

-- ---- Indexes ----
CREATE INDEX IF NOT EXISTS tool_reviews_tool_id_idx  ON tool_reviews (tool_id);
CREATE INDEX IF NOT EXISTS tool_reviews_user_id_idx  ON tool_reviews (user_id);
CREATE INDEX IF NOT EXISTS tool_reviews_rating_idx   ON tool_reviews (rating);

-- ---- Auto-update timestamp ----
CREATE OR REPLACE TRIGGER tool_reviews_updated_at
  BEFORE UPDATE ON tool_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---- Aggregate rating columns on tools ----
ALTER TABLE tools
  ADD COLUMN IF NOT EXISTS avg_rating   numeric(3,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS review_count integer      DEFAULT 0;

-- ---- Function: recalculate tool rating aggregate ----
CREATE OR REPLACE FUNCTION recalculate_tool_rating(p_tool_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE tools
  SET
    avg_rating   = (SELECT ROUND(AVG(rating)::numeric, 2) FROM tool_reviews WHERE tool_id = p_tool_id),
    review_count = (SELECT COUNT(*) FROM tool_reviews WHERE tool_id = p_tool_id)
  WHERE id = p_tool_id;
END;
$$ LANGUAGE plpgsql;

-- ---- Trigger: update aggregate after review insert/update/delete ----
CREATE OR REPLACE FUNCTION handle_tool_review_aggregate()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_tool_rating(OLD.tool_id);
  ELSE
    PERFORM recalculate_tool_rating(NEW.tool_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tool_reviews_aggregate
  AFTER INSERT OR UPDATE OR DELETE ON tool_reviews
  FOR EACH ROW EXECUTE FUNCTION handle_tool_review_aggregate();

-- ---- RLS ----
ALTER TABLE tool_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews
CREATE POLICY "reviews_read_all"
  ON tool_reviews FOR SELECT
  USING (true);

-- Authenticated users can insert their own review
CREATE POLICY "reviews_insert_own"
  ON tool_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update/delete only their own review
CREATE POLICY "reviews_update_own"
  ON tool_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "reviews_delete_own"
  ON tool_reviews FOR DELETE
  USING (auth.uid() = user_id);
