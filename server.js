require("dotenv").config();
const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 4000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function rowToPost(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    body: row.body,
    status: row.status,
    readingMinutes: row.reading_minutes,
    categoryId: row.category_id,
    category: row.category_name || null,
    categorySlug: row.category_slug || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "untitled";
}

function readingMinutes(body) {
  const words = String(body).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

function validatePost(data, { partial = false } = {}) {
  const errors = [];
  const check = (key, fn) => {
    if (!partial || key in data) fn();
  };

  check("title", () => {
    if (!data.title || typeof data.title !== "string" || data.title.trim().length < 3) {
      errors.push("title must be at least 3 characters");
    }
  });

  check("body", () => {
    if (!data.body || typeof data.body !== "string" || data.body.trim().length < 20) {
      errors.push("body must be at least 20 characters");
    }
  });

  check("excerpt", () => {
    if (data.excerpt !== undefined && typeof data.excerpt !== "string") {
      errors.push("excerpt must be a string");
    }
  });

  check("status", () => {
    if (!["draft", "published"].includes(data.status)) {
      errors.push("status must be draft or published");
    }
  });

  check("categoryId", () => {
    const id = Number(data.categoryId);
    if (!Number.isInteger(id) || id < 1) {
      errors.push("categoryId must be a valid category id");
    }
  });

  return errors;
}

async function categoryExists(id) {
  const { rows } = await pool.query("SELECT 1 FROM categories WHERE id = $1", [id]);
  return rows.length > 0;
}

async function uniqueSlug(base, excludeId = null) {
  let slug = slugify(base);
  let candidate = slug;
  let n = 2;
  for (;;) {
    const { rows } = await pool.query(
      "SELECT 1 FROM posts WHERE slug = $1 AND ($2::int IS NULL OR id <> $2)",
      [candidate, excludeId]
    );
    if (rows.length === 0) return candidate;
    candidate = `${slug}-${n++}`;
  }
}

// --- API ---

app.get("/api/posts", async (req, res) => {
  try {
    const status = req.query.status;
    const params = [];
    let where = "";
    if (status === "published" || status === "draft") {
      params.push(status);
      where = "WHERE p.status = $1";
    }
    const { rows } = await pool.query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM posts p
       JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY COALESCE(p.published_at, p.created_at) DESC, p.id DESC`,
      params
    );
    res.json(rows.map(rowToPost));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load posts" });
  }
});

app.get("/api/posts/id/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid post id" });
    const { rows } = await pool.query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM posts p
       JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: "Post not found" });
    res.json(rowToPost(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load post" });
  }
});

app.get("/api/posts/:slug", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM posts p
       JOIN categories c ON c.id = p.category_id
       WHERE p.slug = $1`,
      [req.params.slug]
    );
    if (!rows.length) return res.status(404).json({ error: "Post not found" });
    res.json(rowToPost(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load post" });
  }
});

app.post("/api/posts", async (req, res) => {
  try {
    const errors = validatePost(req.body);
    if (errors.length) return res.status(400).json({ error: "Validation failed", details: errors });

    const categoryId = Number(req.body.categoryId);
    if (!(await categoryExists(categoryId))) {
      return res.status(400).json({ error: "Validation failed", details: ["category does not exist"] });
    }

    const title = req.body.title.trim();
    const body = req.body.body.trim();
    const excerpt = (req.body.excerpt || "").trim() || body.replace(/\s+/g, " ").slice(0, 160) + "…";
    const status = req.body.status;
    const slug = await uniqueSlug(req.body.slug || title);
    const publishedAt = status === "published" ? new Date() : null;

    const { rows } = await pool.query(
      `INSERT INTO posts (category_id, title, slug, excerpt, body, status, reading_minutes, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [categoryId, title, slug, excerpt, body, status, readingMinutes(body), publishedAt]
    );

    const full = await pool.query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM posts p JOIN categories c ON c.id = p.category_id WHERE p.id = $1`,
      [rows[0].id]
    );
    res.status(201).json(rowToPost(full.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create post" });
  }
});

app.put("/api/posts/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid post id" });

    const existing = await pool.query("SELECT * FROM posts WHERE id = $1", [id]);
    if (!existing.rows.length) return res.status(404).json({ error: "Post not found" });

    const errors = validatePost(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ error: "Validation failed", details: errors });

    const current = existing.rows[0];
    const title = "title" in req.body ? String(req.body.title).trim() : current.title;
    const body = "body" in req.body ? String(req.body.body).trim() : current.body;
    const excerpt =
      "excerpt" in req.body
        ? String(req.body.excerpt || "").trim() || body.replace(/\s+/g, " ").slice(0, 160) + "…"
        : current.excerpt;
    const status = "status" in req.body ? req.body.status : current.status;
    const categoryId =
      "categoryId" in req.body ? Number(req.body.categoryId) : current.category_id;

    if (!(await categoryExists(categoryId))) {
      return res.status(400).json({ error: "Validation failed", details: ["category does not exist"] });
    }

    let publishedAt = current.published_at;
    if (status === "published" && !publishedAt) publishedAt = new Date();
    if (status === "draft") publishedAt = null;

    const slug =
      "title" in req.body || "slug" in req.body
        ? await uniqueSlug(req.body.slug || title, id)
        : current.slug;

    const { rows } = await pool.query(
      `UPDATE posts
       SET category_id = $1, title = $2, slug = $3, excerpt = $4, body = $5,
           status = $6, reading_minutes = $7, published_at = $8, updated_at = now()
       WHERE id = $9
       RETURNING *`,
      [categoryId, title, slug, excerpt, body, status, readingMinutes(body), publishedAt, id]
    );

    const full = await pool.query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM posts p JOIN categories c ON c.id = p.category_id WHERE p.id = $1`,
      [id]
    );
    res.json(rowToPost(full.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not update post" });
  }
});

app.delete("/api/posts/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid post id" });
    const { rowCount } = await pool.query("DELETE FROM posts WHERE id = $1", [id]);
    if (!rowCount) return res.status(404).json({ error: "Post not found" });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not delete post" });
  }
});

app.get("/api/categories", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.slug, count(p.id)::int AS post_count
       FROM categories c
       LEFT JOIN posts p ON p.category_id = c.id AND p.status = 'published'
       GROUP BY c.id
       ORDER BY c.name`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load categories" });
  }
});

app.get("/api/stats", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         count(*) FILTER (WHERE status = 'published')::int AS published,
         count(*) FILTER (WHERE status = 'draft')::int AS drafts,
         count(*)::int AS total
       FROM posts`
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load stats" });
  }
});

// SPA-ish fallback: serve HTML pages for non-API GET routes
app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
  const page = req.path === "/" ? "index.html" : req.path.replace(/^\//, "");
  const file = path.join(__dirname, "public", page);
  if (page.endsWith(".html") && require("fs").existsSync(file)) {
    return res.sendFile(file);
  }
  res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
});

app.use((req, res) => res.status(404).json({ error: "Not found" }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

async function start() {
  try {
    await pool.query("SELECT 1");
    app.listen(PORT, () => {
      console.log(`Quire running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  }
}

start();
