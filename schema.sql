-- Quire schema: categories (1) ← posts (N)

DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS categories;

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE
);

CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    reading_minutes INTEGER NOT NULL DEFAULT 1 CHECK (reading_minutes > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ
);

CREATE INDEX posts_status_idx ON posts (status);
CREATE INDEX posts_published_at_idx ON posts (published_at DESC);
CREATE INDEX posts_category_idx ON posts (category_id);
