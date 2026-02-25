-- ============================================================
-- Delta — Initial Database Schema
-- PostgreSQL 15 via Supabase
-- ============================================================

-- ---- Extensions ----
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";     -- pgvector for semantic search

-- ============================================================
-- DOMAIN 1: TOOLS
-- ============================================================

CREATE TABLE organisations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug        TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    logo_url    TEXT,
    website_url TEXT,
    country_code TEXT,
    tool_count  INT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tools (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug            TEXT UNIQUE NOT NULL,
    name            TEXT NOT NULL,
    version         TEXT,
    tagline         TEXT,
    description     TEXT,
    logo_url        TEXT,
    screenshot_url  TEXT,
    website_url     TEXT,
    country_code    TEXT,
    org_id          UUID REFERENCES organisations(id) ON DELETE SET NULL,

    -- Flags
    is_verified     BOOLEAN DEFAULT FALSE,
    is_waitlist     BOOLEAN DEFAULT FALSE,
    is_nsfw         BOOLEAN DEFAULT FALSE,

    -- Engagement
    views_count     INT DEFAULT 0,
    rating_avg      NUMERIC(3,2) DEFAULT 0,
    rating_count    INT DEFAULT 0,
    comment_count   INT DEFAULT 0,
    trending_rank   INT DEFAULT 9999,

    -- Capability
    inputs          TEXT[],
    outputs         TEXT[],
    platforms       TEXT[],

    -- Pricing
    pricing_model   TEXT CHECK (pricing_model IN ('free', 'freemium', 'paid', 'free_trial', 'contact')),
    price_from      NUMERIC(10,2),
    billing_freq    TEXT,
    has_free_tier   BOOLEAN GENERATED ALWAYS AS (pricing_model IN ('free', 'freemium', 'free_trial')) STORED,

    -- Delta-specific
    delta_analysis  TEXT,
    role_scores     JSONB DEFAULT '{}',
    difficulty_avg  NUMERIC(3,1) DEFAULT 2,
    best_for        TEXT[],
    use_cases       TEXT[],

    -- Semantic search vector (1536 dims, text-embedding-3-small)
    embed_vector    vector(1536),

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for tools
CREATE INDEX idx_tools_slug ON tools(slug);
CREATE INDEX idx_tools_trending ON tools(trending_rank ASC);
CREATE INDEX idx_tools_views ON tools(views_count DESC);
CREATE INDEX idx_tools_pricing ON tools(pricing_model);
CREATE INDEX idx_tools_created ON tools(created_at DESC);
CREATE INDEX idx_tools_name_trgm ON tools USING gin(name gin_trgm_ops);
CREATE INDEX idx_tools_tagline_trgm ON tools USING gin(COALESCE(tagline, '') gin_trgm_ops);
CREATE INDEX idx_tools_embed ON tools USING ivfflat(embed_vector vector_cosine_ops) WITH (lists = 100);

CREATE TABLE tasks (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug        TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    emoji       TEXT,
    parent_id   UUID REFERENCES tasks(id) ON DELETE SET NULL,
    tool_count  INT DEFAULT 0,
    sort_order  INT DEFAULT 0
);

-- Many-to-many: tools ↔ tasks
CREATE TABLE tool_tasks (
    tool_id     UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    is_primary  BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (tool_id, task_id)
);

CREATE TABLE releases (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id         UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    version         TEXT NOT NULL,
    release_date    DATE NOT NULL,
    changelog       TEXT[],
    is_latest       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tool_id, version)
);

CREATE TABLE alternatives (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id         UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    alt_tool_id     UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    similarity_score NUMERIC(4,3),
    is_featured     BOOLEAN DEFAULT FALSE,
    UNIQUE (tool_id, alt_tool_id)
);

-- ============================================================
-- DOMAIN 2: USERS & PERSONALISATION
-- ============================================================

CREATE TABLE user_profiles (
    id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name        TEXT,
    role                TEXT,
    industry            TEXT,
    goals               TEXT[],
    ai_level            TEXT,
    skill_level         TEXT DEFAULT 'beginner',
    learning_style      TEXT,
    preferred_categories TEXT[],
    tools_known         TEXT[],
    xp                  INT DEFAULT 0,
    streak_days         INT DEFAULT 0,
    last_active         TIMESTAMPTZ DEFAULT NOW(),
    level               INT DEFAULT 1,
    level_title         TEXT DEFAULT 'Observer',
    lessons_completed   INT DEFAULT 0,
    completed_lesson_ids TEXT[],
    saved_article_ids   TEXT[],
    saved_tool_ids      TEXT[],
    onboarding_complete BOOLEAN DEFAULT FALSE,
    initials            TEXT,
    avatar_url          TEXT,
    onboarded_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: users can only read/write their own profile
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own profile"
    ON user_profiles FOR ALL
    USING (auth.uid() = id);

CREATE TABLE user_tool_saves (
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tool_id     UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    saved_at    TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, tool_id)
);

-- Trigger: increment tools.views_count when a tool is saved
CREATE OR REPLACE FUNCTION increment_tool_views()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE tools SET views_count = views_count + 1 WHERE id = NEW.tool_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tool_save_views
    AFTER INSERT ON user_tool_saves
    FOR EACH ROW EXECUTE FUNCTION increment_tool_views();

CREATE TABLE user_tool_mastery (
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tool_id         UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    mastery_level   INT DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 3),
    lessons_done    INT DEFAULT 0,
    last_practiced  TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, tool_id)
);

CREATE TABLE user_task_follows (
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    followed_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, task_id)
);

-- ============================================================
-- DOMAIN 3: CONTENT
-- ============================================================

CREATE TABLE lessons (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id         UUID REFERENCES tools(id) ON DELETE SET NULL,
    task_id         UUID REFERENCES tasks(id) ON DELETE SET NULL,
    title           TEXT NOT NULL,
    summary         TEXT,
    steps           JSONB,   -- array of { step: int, heading: text, content: text }
    difficulty      INT DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
    duration_mins   INT DEFAULT 3,
    xp_reward       INT DEFAULT 35,
    source_type     TEXT CHECK (source_type IN ('youtube', 'blog', 'manual', 'generated')),
    source_url      TEXT,
    quiz_question   TEXT,
    quiz_options    TEXT[],
    quiz_answer_idx INT,
    completion_count INT DEFAULT 0,
    pill_label      TEXT DEFAULT 'LESSON',
    practice_task   TEXT,
    task_prompt     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lessons_tool ON lessons(tool_id);
CREATE INDEX idx_lessons_task ON lessons(task_id);
CREATE INDEX idx_lessons_difficulty ON lessons(difficulty);

CREATE TABLE news_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    headline        TEXT NOT NULL,
    summary         TEXT,
    source_name     TEXT,
    source_url      TEXT,
    source_logo     TEXT,
    news_type       TEXT CHECK (news_type IN ('major_release', 'new_tool', 'research', 'update', 'trick', 'workflow', 'capability', 'tool-update')),
    fomo_score      INT DEFAULT 5 CHECK (fomo_score BETWEEN 1 AND 10),
    actionability   INT DEFAULT 5 CHECK (actionability BETWEEN 0 AND 10),
    related_tool_id UUID REFERENCES tools(id) ON DELETE SET NULL,
    related_task_ids UUID[],
    published_at    TIMESTAMPTZ,
    fetched_at      TIMESTAMPTZ DEFAULT NOW(),
    is_featured     BOOLEAN DEFAULT FALSE,
    content_hash    TEXT UNIQUE,   -- for deduplication
    classified_data JSONB          -- full VerifiedUpdate object for cache
);

CREATE INDEX idx_news_published ON news_items(published_at DESC);
CREATE INDEX idx_news_fomo ON news_items(fomo_score DESC);
CREATE INDEX idx_news_type ON news_items(news_type);
CREATE INDEX idx_news_hash ON news_items(content_hash);

-- ============================================================
-- DOMAIN 4: ANALYTICS
-- ============================================================

CREATE TABLE tool_views (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id     UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    viewed_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tool_views_tool ON tool_views(tool_id, viewed_at DESC);

-- ============================================================
-- REVIEWS
-- ============================================================

CREATE TABLE reviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id         UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating          INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    pros            TEXT[],
    cons            TEXT[],
    use_case        TEXT,
    body            TEXT,
    helpful_count   INT DEFAULT 0,
    is_verified     BOOLEAN DEFAULT FALSE,  -- user has completed a lesson for this tool
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tool_id, user_id)
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own reviews"
    ON reviews FOR ALL
    USING (auth.uid() = user_id);
CREATE POLICY "Anyone can read reviews"
    ON reviews FOR SELECT
    USING (TRUE);

-- ============================================================
-- CONTENT CACHE (for pipeline results)
-- ============================================================

CREATE TABLE content_cache (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_hash    TEXT UNIQUE NOT NULL,
    source          TEXT,
    title           TEXT,
    summary         TEXT,
    url             TEXT,
    raw_data        JSONB,
    classified_data JSONB,
    relevance_scores JSONB,
    fetched_at      TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ
);

CREATE INDEX idx_content_cache_hash ON content_cache(content_hash);
CREATE INDEX idx_content_cache_source ON content_cache(source);
CREATE INDEX idx_content_cache_expires ON content_cache(expires_at);

-- ============================================================
-- UTILITY: updated_at auto-update trigger
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tools_updated
    BEFORE UPDATE ON tools
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_user_profiles_updated
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_lessons_updated
    BEFORE UPDATE ON lessons
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SEED: Delta's 6 top-level task categories
-- ============================================================

INSERT INTO tasks (slug, name, emoji, sort_order) VALUES
    ('ai-writing',    'AI Writing',      '✍️',  1),
    ('ai-images',     'AI Images',       '🎨',  2),
    ('coding',        'Coding Copilots', '💻',  3),
    ('ai-research',   'AI Research',     '🔬',  4),
    ('video-audio',   'Video & Audio',   '🎵',  5),
    ('career-biz',    'Career & Biz',    '💼',  6);
