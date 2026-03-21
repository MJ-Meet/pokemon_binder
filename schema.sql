-- Pokémon Card Binder — PostgreSQL Schema

CREATE TABLE IF NOT EXISTS binders (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(120)  NOT NULL,
    grid_size  INTEGER       NOT NULL DEFAULT 3 CHECK (grid_size BETWEEN 2 AND 4),
    pages      INTEGER       NOT NULL DEFAULT 10 CHECK (pages BETWEEN 1 AND 200),
    color      VARCHAR(20)   NOT NULL DEFAULT '#e63946',
    created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cards (
    id         SERIAL PRIMARY KEY,
    binder_id  INTEGER       NOT NULL REFERENCES binders(id) ON DELETE CASCADE,
    name       VARCHAR(120)  NOT NULL,
    slot       INTEGER       NOT NULL,
    image_data BYTEA         NOT NULL,
    image_mime VARCHAR(50)   NOT NULL,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (binder_id, slot)
);

CREATE INDEX IF NOT EXISTS idx_cards_binder_id ON cards(binder_id);
CREATE INDEX IF NOT EXISTS idx_binders_created  ON binders(created_at DESC);
