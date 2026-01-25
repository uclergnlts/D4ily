-- Migration: add_political_tone_to_articles
-- Description: Adds AI-generated political tone analysis columns to article tables

-- Add columns to tr_articles
ALTER TABLE tr_articles ADD COLUMN political_tone INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tr_articles ADD COLUMN political_confidence REAL NOT NULL DEFAULT 0;
ALTER TABLE tr_articles ADD COLUMN government_mentioned INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS tr_articles_political_tone_idx ON tr_articles(political_tone);

-- Add columns to de_articles
ALTER TABLE de_articles ADD COLUMN political_tone INTEGER NOT NULL DEFAULT 0;
ALTER TABLE de_articles ADD COLUMN political_confidence REAL NOT NULL DEFAULT 0;
ALTER TABLE de_articles ADD COLUMN government_mentioned INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS de_articles_political_tone_idx ON de_articles(political_tone);

-- Add columns to us_articles
ALTER TABLE us_articles ADD COLUMN political_tone INTEGER NOT NULL DEFAULT 0;
ALTER TABLE us_articles ADD COLUMN political_confidence REAL NOT NULL DEFAULT 0;
ALTER TABLE us_articles ADD COLUMN government_mentioned INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS us_articles_political_tone_idx ON us_articles(political_tone);
