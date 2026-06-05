-- Safe Migration V2 — add new columns to cards table
-- Run these statements in order; all are idempotent (IF NOT EXISTS)

ALTER TABLE cards ADD COLUMN IF NOT EXISTS favorite        BOOLEAN      NOT NULL DEFAULT FALSE;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS rarity          VARCHAR(30);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS notes           TEXT;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS set_name        VARCHAR(120);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS set_total_cards INTEGER;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS card_number     INTEGER;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS date_updated    TIMESTAMPTZ;
