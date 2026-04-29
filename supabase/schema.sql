-- ============================================================
-- HasanPulse — Supabase PostgreSQL Schema
-- Run this in the Supabase SQL Editor to create all tables.
-- ============================================================

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name       TEXT        NOT NULL,
  last_name        TEXT        NOT NULL DEFAULT '',
  username         TEXT        NOT NULL UNIQUE,
  email            TEXT        UNIQUE,
  password         TEXT        NOT NULL,
  profile_picture  TEXT        DEFAULT '',
  origin           TEXT,
  current_location TEXT,
  birth_date       DATE,
  gender           TEXT,
  marital_status   TEXT,
  education        TEXT,
  work             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── auto-update updated_at ───────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Follows (replaces following / followers arrays) ──────────
CREATE TABLE IF NOT EXISTS follows (
  follower_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

-- ── Posts ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  content    TEXT        NOT NULL,
  author_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image      TEXT        DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Post Likes (replaces likes array) ────────────────────────
CREATE TABLE IF NOT EXISTS post_likes (
  post_id    UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

-- ── Comments (replaces embedded comments array) ──────────────
CREATE TABLE IF NOT EXISTS comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
