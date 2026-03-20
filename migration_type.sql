-- Migration: Add card_type column to cards table
-- Run ONCE on existing DB: psql -U postgres -d pokemon_binder -f migration_type.sql

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS card_type VARCHAR(20);
