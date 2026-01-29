-- Migration: Add detail_content column to article tables
-- Description: Adds a separate detail_content field for full article content,
-- distinct from the summary field which is used for article previews

-- Add detail_content column to tr_articles
ALTER TABLE tr_articles ADD COLUMN detail_content TEXT;

-- Add detail_content column to de_articles
ALTER TABLE de_articles ADD COLUMN detail_content TEXT;

-- Add detail_content column to us_articles
ALTER TABLE us_articles ADD COLUMN detail_content TEXT;

-- Add detail_content column to uk_articles
ALTER TABLE uk_articles ADD COLUMN detail_content TEXT;

-- Add detail_content column to fr_articles
ALTER TABLE fr_articles ADD COLUMN detail_content TEXT;

-- Add detail_content column to es_articles
ALTER TABLE es_articles ADD COLUMN detail_content TEXT;

-- Add detail_content column to it_articles
ALTER TABLE it_articles ADD COLUMN detail_content TEXT;

-- Add detail_content column to ru_articles
ALTER TABLE ru_articles ADD COLUMN detail_content TEXT;
