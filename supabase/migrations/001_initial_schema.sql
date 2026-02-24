-- ============================================================
-- Delta AI — Initial Database Schema
-- Migration 001: All 18 tables across 4 domains
-- Run in Supabase SQL Editor
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;         -- pgvector for semantic search
CREATE EXTENSION IF NOT EXISTS pg_trgm;        -- fuzzy text search

-- ============================================================
-- DOMAIN 1: TOOLS
-- ============================================================

-- Organisations (OpenAI, Anthropic, Google, etc.)
CREATE TABLE IF NOT EXISTS organisations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug         TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  logo_url     TEXT,
  website_url  TEXT,
  country_code CHAR(2),
  tool_count   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Tools — core table (TAAFT-style + Delta extensions)
-- Note: embed_vector uses 768 dims (Gemini text-embedding-004)
CREATE TABLE IF NOT EXISTS tools (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  version         TEXT,
  tagline         TEXT,
  description     TEXT,
  logo_url        TEXT,
  screenshot_url  TEXT,
  website_url     TEXT NOT NULL,
  country_code    CHAR(2),
  org_id          UUID REFERENCES organisations(id),
  is_verified     BOOLEAN DEFAULT FALSE,
  is_waitlist     BOOLEAN DEFAULT FALSE,
  is_nsfw         BOOLEAN DEFAULT FALSE,
  status          TEXT DEFAULT 'live' CHECK (status IN ('discovered','fetched','enriched','pending_review','live','stale')),
  views_count     INTEGER DEFAULT 0,
  rating_avg      NUMERIC(3,2) DEFAULT 0,
  rating_count    INTEGER DEFAULT 0,
  comment_count   INTEGER DEFAULT 0,
  trending_rank   INTEGER,
  inputs          TEXT[],
  outputs         TEXT[],
  platforms       TEXT[],
  pricing_model   TEXT NOT NULL DEFAULT 'Freemium' CHECK (pricing_model IN ('Free','Freemium','Paid','Free_Trial','Contact')),
  price_from      NUMERIC(10,2),
  billing_freq    TEXT,
  has_free_tier   BOOLEAN GENERATED ALWAYS AS (pricing_model IN ('Free','Freemium')) STORED,
  -- Delta-specific columns
  delta_analysis  TEXT,              -- "Delta's take" editorial opinion
  role_scores     JSONB DEFAULT '{}', -- {"Developer": 8, "Marketer": 6, ...}
  difficulty_avg  NUMERIC(3,1) DEFAULT 2,
  best_for        TEXT[],
  use_cases       TEXT[],
  -- Semantic search vector (Gemini text-embedding-004 = 768 dims)
  embed_vector    vector(768),
  -- Ingestion confidence
  ingestion_confidence NUMERIC(3,2),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for tools
CREATE INDEX IF NOT EXISTS idx_tools_slug       ON tools(slug);
CREATE INDEX IF NOT EXISTS idx_tools_status     ON tools(status);
CREATE INDEX IF NOT EXISTS idx_tools_trending   ON tools(trending_rank) WHERE trending_rank IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tools_views      ON tools(views_count DESC);
CREATE INDEX IF NOT EXISTS idx_tools_pricing    ON tools(pricing_model, has_free_tier);
CREATE INDEX IF NOT EXISTS idx_tools_created    ON tools(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tools_vector     ON tools USING ivfflat (embed_vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_tools_trgm_name  ON tools USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tools_trgm_tag   ON tools USING gin (COALESCE(tagline,'') gin_trgm_ops);

-- Tasks / Categories (TAAFT taxonomy)
CREATE TABLE IF NOT EXISTS tasks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  emoji       TEXT,
  parent_id   UUID REFERENCES tasks(id),
  tool_count  INTEGER DEFAULT 0,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_slug   ON tasks(slug);

-- Tool-Task junction (many-to-many)
CREATE TABLE IF NOT EXISTS tool_tasks (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id    UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  confidence NUMERIC(3,2),
  UNIQUE (tool_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_tool_tasks_tool ON tool_tasks(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_tasks_task ON tool_tasks(task_id);

-- Releases (version history)
CREATE TABLE IF NOT EXISTS releases (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id      UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  version      TEXT NOT NULL,
  release_date DATE NOT NULL,
  changelog    TEXT[],
  is_latest    BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tool_id, version)
);

CREATE INDEX IF NOT EXISTS idx_releases_tool   ON releases(tool_id);
CREATE INDEX IF NOT EXISTS idx_releases_date   ON releases(release_date DESC);
CREATE INDEX IF NOT EXISTS idx_releases_latest ON releases(tool_id) WHERE is_latest = TRUE;

-- Alternatives (similarity-based)
CREATE TABLE IF NOT EXISTS alternatives (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id          UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  alt_tool_id      UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  similarity_score NUMERIC(5,4),
  is_featured      BOOLEAN DEFAULT FALSE,
  UNIQUE (tool_id, alt_tool_id)
);

CREATE INDEX IF NOT EXISTS idx_alternatives_tool ON alternatives(tool_id);

-- ============================================================
-- DOMAIN 2: USERS & PERSONALISATION
-- ============================================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name   TEXT,
  role           TEXT,
  industry       TEXT,
  goals          TEXT[] DEFAULT '{}',
  skill_level    TEXT DEFAULT 'beginner',
  ai_level       TEXT DEFAULT 'Beginner',
  preferred_categories TEXT[] DEFAULT '{}',
  tools_known    TEXT[] DEFAULT '{}',
  learning_style TEXT,
  xp             INTEGER DEFAULT 0,
  streak_days    INTEGER DEFAULT 0,
  last_active    DATE,
  level          INTEGER DEFAULT 1,
  level_title    TEXT DEFAULT 'Observer',
  avatar_url     TEXT,
  onboarded_at   TIMESTAMPTZ,
  lessons_completed INTEGER DEFAULT 0,
  completed_lesson_ids TEXT[] DEFAULT '{}',
  saved_article_ids    TEXT[] DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- User tool saves (bookmarks)
CREATE TABLE IF NOT EXISTS user_tool_saves (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  tool_id   UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  saved_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, tool_id)
);

CREATE INDEX IF NOT EXISTS idx_user_tool_saves_user ON user_tool_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tool_saves_tool ON user_tool_saves(tool_id);

-- User tool mastery (skill progress)
CREATE TABLE IF NOT EXISTS user_tool_mastery (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  tool_id         UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  mastery_level   INTEGER DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 3),
  lessons_done    INTEGER DEFAULT 0,
  last_practiced  TIMESTAMPTZ,
  UNIQUE (user_id, tool_id)
);

CREATE INDEX IF NOT EXISTS idx_user_mastery_user ON user_tool_mastery(user_id);

-- User task follows (interests)
CREATE TABLE IF NOT EXISTS user_task_follows (
  user_id     UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  followed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, task_id)
);

-- ============================================================
-- DOMAIN 3: CONTENT (LESSONS & NEWS)
-- ============================================================

-- Lessons
CREATE TABLE IF NOT EXISTS lessons (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id          UUID REFERENCES tools(id) ON DELETE SET NULL,
  task_id          UUID REFERENCES tasks(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  summary          TEXT,
  steps            JSONB,         -- [{step: 1, heading: "...", content: "..."}]
  difficulty       INTEGER DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
  duration_mins    INTEGER,
  xp_reward        INTEGER DEFAULT 50,
  source_type      TEXT,          -- "youtube", "blog", "manual", "generated"
  source_url       TEXT,
  quiz_question    TEXT,
  quiz_options     TEXT[],
  quiz_answer_idx  INTEGER,
  completion_count INTEGER DEFAULT 0,
  pill_label       TEXT DEFAULT 'LESSON',
  practice_task    TEXT,
  task_prompt      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_tool ON lessons(tool_id);
CREATE INDEX IF NOT EXISTS idx_lessons_task ON lessons(task_id);
CREATE INDEX IF NOT EXISTS idx_lessons_dur  ON lessons(duration_mins);
CREATE INDEX IF NOT EXISTS idx_lessons_diff ON lessons(difficulty);

-- User lesson completions (pivot)
CREATE TABLE IF NOT EXISTS user_lesson_completions (
  user_id      UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  lesson_id    UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  xp_earned    INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, lesson_id)
);

-- News items
CREATE TABLE IF NOT EXISTS news_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  headline         TEXT NOT NULL,
  summary          TEXT,
  source_name      TEXT,
  source_url       TEXT,
  source_logo      TEXT,
  news_type        TEXT CHECK (news_type IN ('major_release','new-tool','research','tool-update','trick','workflow','capability','price_change')),
  fomo_score       INTEGER CHECK (fomo_score BETWEEN 1 AND 10),
  actionability    INTEGER CHECK (actionability BETWEEN 0 AND 10),
  related_tool_id  UUID REFERENCES tools(id) ON DELETE SET NULL,
  related_task_ids UUID[],
  published_at     TIMESTAMPTZ NOT NULL,
  fetched_at       TIMESTAMPTZ DEFAULT NOW(),
  is_featured      BOOLEAN DEFAULT FALSE,
  delta_summary    TEXT          -- rewritten in Delta voice
);

CREATE INDEX IF NOT EXISTS idx_news_published ON news_items(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_fomo      ON news_items(fomo_score DESC);
CREATE INDEX IF NOT EXISTS idx_news_type      ON news_items(news_type);
CREATE INDEX IF NOT EXISTS idx_news_featured  ON news_items(is_featured) WHERE is_featured = TRUE;

-- ============================================================
-- DOMAIN 4: ANALYTICS & SOCIAL
-- ============================================================

-- Tool views (for trending calculation)
CREATE TABLE IF NOT EXISTS tool_views (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id   UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_views_tool_date ON tool_views(tool_id, viewed_at);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id       UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  pros          TEXT[],
  cons          TEXT[],
  use_case      TEXT,
  body          TEXT,
  helpful_count INTEGER DEFAULT 0,
  is_verified   BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tool_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_tool ON reviews(tool_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);

-- Tool discovery queue (ingestion pipeline staging area)
CREATE TABLE IF NOT EXISTS discovery_queue (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url          TEXT NOT NULL,
  candidate_name TEXT,
  source       TEXT,          -- "product_hunt", "github_trending", "reddit", "hn", "newsletter"
  raw_signals  INTEGER DEFAULT 1,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','fetching','parsing','enriching','ready','duplicate','rejected')),
  error_msg    TEXT,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at  TIMESTAMPTZ,
  UNIQUE (url)
);

CREATE INDEX IF NOT EXISTS idx_queue_status ON discovery_queue(status, discovered_at);

-- Content cache (existing table — updated structure)
CREATE TABLE IF NOT EXISTS content_cache (
  content_hash   TEXT PRIMARY KEY,
  source         TEXT NOT NULL,
  title          TEXT,
  summary        TEXT,
  url            TEXT,
  raw_data       JSONB,
  classified_data JSONB,
  relevance_scores JSONB,
  fetched_at     TIMESTAMPTZ DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_content_cache_expires ON content_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_content_cache_source  ON content_cache(source);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE user_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tool_saves      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tool_mastery    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_task_follows    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_lesson_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews              ENABLE ROW LEVEL SECURITY;

-- user_profiles: users can only read/write their own row
CREATE POLICY "users_own_profile" ON user_profiles
  FOR ALL USING (auth.uid() = id);

-- user_tool_saves
CREATE POLICY "users_own_saves" ON user_tool_saves
  FOR ALL USING (auth.uid() = user_id);

-- user_tool_mastery
CREATE POLICY "users_own_mastery" ON user_tool_mastery
  FOR ALL USING (auth.uid() = user_id);

-- user_task_follows
CREATE POLICY "users_own_follows" ON user_task_follows
  FOR ALL USING (auth.uid() = user_id);

-- user_lesson_completions
CREATE POLICY "users_own_completions" ON user_lesson_completions
  FOR ALL USING (auth.uid() = user_id);

-- reviews: users can read all, write only their own
CREATE POLICY "reviews_read_all"  ON reviews FOR SELECT USING (TRUE);
CREATE POLICY "reviews_write_own" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_update_own" ON reviews FOR UPDATE USING (auth.uid() = user_id);
