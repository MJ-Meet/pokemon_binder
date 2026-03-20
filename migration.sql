-- Pokémon Card Binder — Migration: Tags Feature
-- Run once on existing DB:
--   psql -U postgres -d pokemon_binder -f migration.sql

CREATE TABLE IF NOT EXISTS tags (
    id         SERIAL      PRIMARY KEY,
    name       VARCHAR(50) NOT NULL UNIQUE,
    color      VARCHAR(20) NOT NULL DEFAULT '#ffcb05',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS card_tags (
    card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    tag_id  INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
    PRIMARY KEY (card_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_card_tags_card_id ON card_tags(card_id);
CREATE INDEX IF NOT EXISTS idx_card_tags_tag_id  ON card_tags(tag_id);
