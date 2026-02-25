-- ============================================================
-- Delta AI — Database Functions & Triggers
-- Migration 002: Personalisation engine, search, triggers
-- ============================================================

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at on tools
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tools_updated_at
  BEFORE UPDATE ON tools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Increment/decrement tools.views_count when user saves/unsaves
CREATE OR REPLACE FUNCTION handle_tool_save_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tools SET views_count = views_count + 1 WHERE id = NEW.tool_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tools SET views_count = GREATEST(0, views_count - 1) WHERE id = OLD.tool_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tool_save_count_trigger
  AFTER INSERT OR DELETE ON user_tool_saves
  FOR EACH ROW EXECUTE FUNCTION handle_tool_save_count();

-- Update tasks.tool_count when tool_tasks changes
CREATE OR REPLACE FUNCTION handle_task_tool_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tasks SET tool_count = tool_count + 1 WHERE id = NEW.task_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tasks SET tool_count = GREATEST(0, tool_count - 1) WHERE id = OLD.task_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER task_tool_count_trigger
  AFTER INSERT OR DELETE ON tool_tasks
  FOR EACH ROW EXECUTE FUNCTION handle_task_tool_count();

-- Update organisation.tool_count when tools change
CREATE OR REPLACE FUNCTION handle_org_tool_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.org_id IS NOT NULL THEN
    UPDATE organisations SET tool_count = tool_count + 1 WHERE id = NEW.org_id;
  ELSIF TG_OP = 'DELETE' AND OLD.org_id IS NOT NULL THEN
    UPDATE organisations SET tool_count = GREATEST(0, tool_count - 1) WHERE id = OLD.org_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.org_id IS DISTINCT FROM NEW.org_id THEN
      IF OLD.org_id IS NOT NULL THEN
        UPDATE organisations SET tool_count = GREATEST(0, tool_count - 1) WHERE id = OLD.org_id;
      END IF;
      IF NEW.org_id IS NOT NULL THEN
        UPDATE organisations SET tool_count = tool_count + 1 WHERE id = NEW.org_id;
      END IF;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER org_tool_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tools
  FOR EACH ROW EXECUTE FUNCTION handle_org_tool_count();

-- Update lessons.completion_count when user completes a lesson
CREATE OR REPLACE FUNCTION handle_lesson_completion_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE lessons SET completion_count = completion_count + 1 WHERE id = NEW.lesson_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER lesson_completion_count_trigger
  AFTER INSERT ON user_lesson_completions
  FOR EACH ROW EXECUTE FUNCTION handle_lesson_completion_count();

-- Only one release can be "latest" per tool
CREATE OR REPLACE FUNCTION ensure_single_latest_release()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_latest THEN
    UPDATE releases SET is_latest = FALSE
    WHERE tool_id = NEW.tool_id AND id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER single_latest_release
  BEFORE INSERT OR UPDATE ON releases
  FOR EACH ROW EXECUTE FUNCTION ensure_single_latest_release();

-- ============================================================
-- PERSONALISATION ENGINE
-- Calculates match score for every tool for a given user
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_match_scores(p_user_id UUID)
RETURNS TABLE(tool_id UUID, match_score INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
  v_role TEXT;
  v_skill TEXT;
  v_followed_tasks UUID[];
  v_mastered_tools UUID[];
BEGIN
  -- Load user context
  SELECT role, skill_level
  INTO v_role, v_skill
  FROM user_profiles
  WHERE id = p_user_id;

  SELECT ARRAY_AGG(task_id)
  INTO v_followed_tasks
  FROM user_task_follows
  WHERE user_id = p_user_id;

  SELECT ARRAY_AGG(utm.tool_id)
  INTO v_mastered_tools
  FROM user_tool_mastery utm
  WHERE utm.user_id = p_user_id AND utm.mastery_level > 0;

  RETURN QUERY
  SELECT
    t.id AS tool_id,
    LEAST(100,
      -- Factor 1: Task alignment — 30 pts
      CASE WHEN v_followed_tasks IS NOT NULL AND EXISTS (
        SELECT 1 FROM tool_tasks tt
        WHERE tt.tool_id = t.id AND tt.task_id = ANY(v_followed_tasks)
      ) THEN 30 ELSE 0 END
      +
      -- Factor 2: Role match — 25 pts (from pre-scored JSONB)
      COALESCE((t.role_scores ->> v_role)::INT, 0) * 25 / 10
      +
      -- Factor 3: Skill level fit — 20 pts
      CASE
        WHEN v_skill = 'beginner'      AND t.difficulty_avg <= 2   THEN 20
        WHEN v_skill = 'intermediate'  AND t.difficulty_avg BETWEEN 2 AND 3 THEN 20
        WHEN v_skill = 'advanced'      AND t.difficulty_avg >= 3   THEN 20
        ELSE 10
      END
      +
      -- Factor 4: Has free tier — 15 pts
      CASE WHEN t.has_free_tier THEN 15 ELSE 5 END
      +
      -- Factor 5: Trending — 10 pts
      CASE WHEN t.trending_rank IS NOT NULL THEN GREATEST(0, 10 - t.trending_rank / 5) ELSE 0 END
    ) AS match_score
  FROM tools t
  WHERE
    t.status = 'live'
    AND (v_mastered_tools IS NULL OR t.id <> ALL(v_mastered_tools))
  ORDER BY match_score DESC;
END;
$$;

-- ============================================================
-- SEARCH FUNCTION
-- 3-layer search: full-text (pg_trgm) + semantic (pgvector) + filters
-- ============================================================

CREATE OR REPLACE FUNCTION search_tools(
  p_query        TEXT,
  p_user_id      UUID      DEFAULT NULL,
  p_task_slug    TEXT      DEFAULT NULL,
  p_pricing      TEXT      DEFAULT NULL,   -- "free","paid","freemium"
  p_platform     TEXT      DEFAULT NULL,   -- "ios","web","api"
  p_limit        INT       DEFAULT 20,
  p_offset       INT       DEFAULT 0,
  p_embedding    vector(768) DEFAULT NULL  -- pre-computed query embedding from app layer
)
RETURNS TABLE(
  id          UUID,
  name        TEXT,
  tagline     TEXT,
  slug        TEXT,
  logo_url    TEXT,
  pricing_model TEXT,
  has_free_tier BOOLEAN,
  views_count INTEGER,
  trending_rank INTEGER,
  match_score INT,
  search_rank FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH text_results AS (
    SELECT
      t.id,
      (
        similarity(t.name, p_query) * 0.5 +
        similarity(COALESCE(t.tagline,''), p_query) * 0.3 +
        CASE WHEN t.description ILIKE '%' || p_query || '%' THEN 0.2 ELSE 0 END
      ) AS text_score
    FROM tools t
    WHERE
      t.status = 'live'
      AND (
        similarity(t.name || ' ' || COALESCE(t.tagline,''), p_query) > 0.15
        OR t.description ILIKE '%' || p_query || '%'
        OR t.name ILIKE '%' || p_query || '%'
      )
  ),
  semantic_results AS (
    SELECT t.id, 1.0 - (t.embed_vector <=> p_embedding) AS semantic_score
    FROM tools t
    WHERE t.status = 'live' AND p_embedding IS NOT NULL AND t.embed_vector IS NOT NULL
    ORDER BY t.embed_vector <=> p_embedding
    LIMIT 50
  ),
  user_scores AS (
    SELECT * FROM calculate_match_scores(p_user_id) WHERE p_user_id IS NOT NULL
  )
  SELECT
    t.id,
    t.name,
    t.tagline,
    t.slug,
    t.logo_url,
    t.pricing_model,
    t.has_free_tier,
    t.views_count,
    t.trending_rank,
    COALESCE(us.match_score, 50)::INT AS match_score,
    GREATEST(
      COALESCE(tr.text_score, 0),
      COALESCE(sr.semantic_score * 0.85, 0)
    ) AS search_rank
  FROM tools t
  LEFT JOIN text_results    tr ON tr.id = t.id
  LEFT JOIN semantic_results sr ON sr.id = t.id
  LEFT JOIN user_scores      us ON us.tool_id = t.id
  LEFT JOIN tool_tasks       tt ON tt.tool_id = t.id
  LEFT JOIN tasks            tk ON tk.id = tt.task_id
  WHERE
    t.status = 'live'
    AND (tr.id IS NOT NULL OR sr.id IS NOT NULL)
    AND (p_task_slug IS NULL OR tk.slug = p_task_slug)
    AND (p_pricing IS NULL OR t.pricing_model ILIKE p_pricing)
    AND (p_platform IS NULL OR p_platform = ANY(t.platforms))
  GROUP BY t.id, t.name, t.tagline, t.slug, t.logo_url,
           t.pricing_model, t.has_free_tier, t.views_count,
           t.trending_rank, us.match_score, tr.text_score, sr.semantic_score
  ORDER BY search_rank DESC, match_score DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- ============================================================
-- TRENDING RANK RECALCULATION
-- Run daily via pg_cron or Edge Function scheduler
-- Rank = view velocity (views in last 7 days vs prior 7 days)
-- ============================================================

CREATE OR REPLACE FUNCTION recalculate_trending_ranks()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  WITH velocity AS (
    SELECT
      tool_id,
      COUNT(*) FILTER (WHERE viewed_at >= NOW() - INTERVAL '7 days') AS recent_views,
      COUNT(*) FILTER (WHERE viewed_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days') AS prior_views
    FROM tool_views
    GROUP BY tool_id
  ),
  ranked AS (
    SELECT
      tool_id,
      ROW_NUMBER() OVER (
        ORDER BY
          (recent_views - prior_views) DESC,
          recent_views DESC
      ) AS new_rank
    FROM velocity
    WHERE recent_views > 0
  )
  UPDATE tools t
  SET trending_rank = r.new_rank
  FROM ranked r
  WHERE t.id = r.tool_id;

  -- Null out tools with no recent views
  UPDATE tools
  SET trending_rank = NULL
  WHERE id NOT IN (
    SELECT DISTINCT tool_id FROM tool_views
    WHERE viewed_at >= NOW() - INTERVAL '7 days'
  );
END;
$$;

-- ============================================================
-- XP / LEVEL AWARD FUNCTION
-- Called by lessons API after lesson completion
-- ============================================================

CREATE OR REPLACE FUNCTION award_xp(
  p_user_id  UUID,
  p_lesson_id UUID,
  p_xp       INTEGER DEFAULT 50
)
RETURNS TABLE(new_xp INTEGER, new_level INTEGER, new_level_title TEXT, leveled_up BOOLEAN)
LANGUAGE plpgsql AS $$
DECLARE
  v_old_level  INTEGER;
  v_new_xp     INTEGER;
  v_new_level  INTEGER;
  v_new_title  TEXT;
BEGIN
  -- Check if already completed
  IF EXISTS (
    SELECT 1 FROM user_lesson_completions
    WHERE user_id = p_user_id AND lesson_id = p_lesson_id
  ) THEN
    -- Already completed — return current state, no XP awarded
    SELECT xp, level, level_title
    INTO v_new_xp, v_new_level, v_new_title
    FROM user_profiles WHERE id = p_user_id;
    RETURN QUERY SELECT v_new_xp, v_new_level, v_new_title, FALSE;
    RETURN;
  END IF;

  -- Insert completion record
  INSERT INTO user_lesson_completions(user_id, lesson_id, xp_earned)
  VALUES (p_user_id, p_lesson_id, p_xp)
  ON CONFLICT DO NOTHING;

  -- Award XP and update level
  SELECT level INTO v_old_level FROM user_profiles WHERE id = p_user_id;

  UPDATE user_profiles
  SET
    xp = xp + p_xp,
    lessons_completed = lessons_completed + 1,
    completed_lesson_ids = array_append(completed_lesson_ids, p_lesson_id::TEXT),
    level = CASE
      WHEN xp + p_xp >= 1000 THEN 6
      WHEN xp + p_xp >= 600  THEN 5
      WHEN xp + p_xp >= 300  THEN 4
      WHEN xp + p_xp >= 150  THEN 3
      WHEN xp + p_xp >= 50   THEN 2
      ELSE 1
    END,
    level_title = CASE
      WHEN xp + p_xp >= 1000 THEN 'Oracle'
      WHEN xp + p_xp >= 600  THEN 'Visionary'
      WHEN xp + p_xp >= 300  THEN 'Architect'
      WHEN xp + p_xp >= 150  THEN 'Builder'
      WHEN xp + p_xp >= 50   THEN 'Explorer'
      ELSE 'Observer'
    END,
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING xp, level, level_title INTO v_new_xp, v_new_level, v_new_title;

  RETURN QUERY SELECT v_new_xp, v_new_level, v_new_title, (v_new_level > v_old_level);
END;
$$;

-- ============================================================
-- STREAK UPDATE FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  v_last_active DATE;
  v_streak      INTEGER;
  v_today       DATE := CURRENT_DATE;
BEGIN
  SELECT last_active, streak_days
  INTO v_last_active, v_streak
  FROM user_profiles WHERE id = p_user_id;

  IF v_last_active IS NULL OR v_last_active < v_today - INTERVAL '1 day' THEN
    -- More than 1 day gap — reset streak
    v_streak := 1;
  ELSIF v_last_active = v_today - INTERVAL '1 day' THEN
    -- Consecutive day — increment
    v_streak := COALESCE(v_streak, 0) + 1;
  END IF;
  -- Same day: no change

  UPDATE user_profiles
  SET last_active = v_today, streak_days = v_streak, updated_at = NOW()
  WHERE id = p_user_id;

  RETURN v_streak;
END;
$$;
