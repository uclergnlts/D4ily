-- Migration: add_source_votes
-- Description: Adds table for user votes on source alignment

CREATE TABLE IF NOT EXISTS source_votes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    source_id INTEGER NOT NULL REFERENCES rss_sources(id),
    score INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS source_votes_user_source_idx ON source_votes(user_id, source_id);
