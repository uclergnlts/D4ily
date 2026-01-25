-- Migration: add_editorial_alignment_to_sources
-- Description: Adds government alignment scoring for Turkish sources

-- Add columns to rss_sources
ALTER TABLE rss_sources ADD COLUMN gov_alignment_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rss_sources ADD COLUMN gov_alignment_label TEXT;
ALTER TABLE rss_sources ADD COLUMN gov_alignment_confidence REAL DEFAULT 0.7;
ALTER TABLE rss_sources ADD COLUMN gov_alignment_notes TEXT;
ALTER TABLE rss_sources ADD COLUMN gov_alignment_last_updated INTEGER;

-- Create alignment history table for audit trail
CREATE TABLE IF NOT EXISTS source_alignment_history (
    id TEXT PRIMARY KEY,
    source_id INTEGER NOT NULL REFERENCES rss_sources(id),
    old_score INTEGER,
    new_score INTEGER NOT NULL,
    old_label TEXT,
    new_label TEXT,
    reason TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS source_alignment_history_source_idx ON source_alignment_history(source_id);
CREATE INDEX IF NOT EXISTS source_alignment_history_date_idx ON source_alignment_history(updated_at);

-- Create article perspectives matching cache
CREATE TABLE IF NOT EXISTS article_perspectives (
    id TEXT PRIMARY KEY,
    main_article_id TEXT NOT NULL,
    related_article_id TEXT NOT NULL,
    similarity_score REAL NOT NULL,
    matched_entities TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS article_perspectives_main_idx ON article_perspectives(main_article_id);
CREATE UNIQUE INDEX IF NOT EXISTS article_perspectives_unique_pair ON article_perspectives(main_article_id, related_article_id);
