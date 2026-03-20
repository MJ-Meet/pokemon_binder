-- Migration: Update maximum pages per binder from 50 to 200
-- Run ONCE on existing DB: psql -U postgres -d pokemon_binder -f migration_pages.sql

ALTER TABLE binders DROP CONSTRAINT IF EXISTS ck_binders_pages;

ALTER TABLE binders ADD CONSTRAINT ck_binders_pages CHECK (pages BETWEEN 1 AND 200);
