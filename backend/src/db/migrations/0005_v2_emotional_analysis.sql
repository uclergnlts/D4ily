-- Migration: v2_emotional_analysis
-- Description: Adds emotional analysis columns to articles and alignment feedback tables

-- =============================================
-- PART 1: Emotional Analysis Columns for Articles
-- =============================================

-- Add emotional analysis columns to tr_articles
ALTER TABLE tr_articles ADD COLUMN emotional_tone TEXT;
ALTER TABLE tr_articles ADD COLUMN emotional_intensity REAL;
ALTER TABLE tr_articles ADD COLUMN loaded_language_score REAL;
ALTER TABLE tr_articles ADD COLUMN sensationalism_score REAL;

-- Add emotional analysis columns to de_articles
ALTER TABLE de_articles ADD COLUMN emotional_tone TEXT;
ALTER TABLE de_articles ADD COLUMN emotional_intensity REAL;
ALTER TABLE de_articles ADD COLUMN loaded_language_score REAL;
ALTER TABLE de_articles ADD COLUMN sensationalism_score REAL;

-- Add emotional analysis columns to us_articles
ALTER TABLE us_articles ADD COLUMN emotional_tone TEXT;
ALTER TABLE us_articles ADD COLUMN emotional_intensity REAL;
ALTER TABLE us_articles ADD COLUMN loaded_language_score REAL;
ALTER TABLE us_articles ADD COLUMN sensationalism_score REAL;

-- =============================================
-- PART 2: Source Alignment Voting Tables
-- =============================================

-- Source alignment votes - Users can vote on alignment accuracy
CREATE TABLE IF NOT EXISTS source_alignment_votes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_id INTEGER NOT NULL,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('agree', 'disagree', 'unsure')),
    suggested_score INTEGER,
    comment TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(user_id, source_id)
);

CREATE INDEX IF NOT EXISTS source_alignment_votes_user_idx ON source_alignment_votes(user_id);
CREATE INDEX IF NOT EXISTS source_alignment_votes_source_idx ON source_alignment_votes(source_id);

-- User alignment reputation - Track user voting accuracy
CREATE TABLE IF NOT EXISTS user_alignment_reputation (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_votes INTEGER NOT NULL DEFAULT 0,
    accurate_votes INTEGER NOT NULL DEFAULT 0,
    reputation_score REAL NOT NULL DEFAULT 0.5,
    last_vote_at INTEGER,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- =============================================
-- PART 3: Pending Alignment Notifications Queue
-- =============================================

-- Pending alignment notifications - Queue for alignment change notifications
CREATE TABLE IF NOT EXISTS pending_alignment_notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_id INTEGER NOT NULL,
    source_name TEXT NOT NULL,
    old_score INTEGER,
    new_score INTEGER NOT NULL,
    old_label TEXT,
    new_label TEXT,
    change_reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    sent_at INTEGER
);

CREATE INDEX IF NOT EXISTS pending_alignment_notif_user_idx ON pending_alignment_notifications(user_id);
CREATE INDEX IF NOT EXISTS pending_alignment_notif_status_idx ON pending_alignment_notifications(status);
CREATE INDEX IF NOT EXISTS pending_alignment_notif_source_idx ON pending_alignment_notifications(source_id);

-- =============================================
-- PART 4: User Notification Preferences Update
-- =============================================

-- Add alignment changes notification preference
ALTER TABLE user_notification_preferences ADD COLUMN notif_alignment_changes INTEGER NOT NULL DEFAULT 1;
