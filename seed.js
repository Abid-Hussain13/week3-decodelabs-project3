require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const categories = [
  { name: "Systems", slug: "systems" },
  { name: "Craft", slug: "craft" },
  { name: "Databases", slug: "databases" },
  { name: "Notes", slug: "notes" },
];

const posts = [
  {
    category: "databases",
    title: "Why your schema is the real product",
    status: "published",
    excerpt:
      "UIs get rebuilt every two years. The shape of your data outlives every framework you will ever pick.",
    body: `Most teams treat the schema as a chore that happens before the "real" work begins. That is backwards. The schema is the longest-lived artifact in the system — outlasting frontends, admin panels, and often the original authors.

## Design for the questions you will ask

Start from the reports and lookups the product needs, not from the forms on the screen. A form is a moment; a query is forever. When you design around questions, you naturally end up with indices, sensible keys, and relationships that do not need a rewrite six months later.

## Constraints are a feature

A CHECK on status values, a foreign key with RESTRICT, a NOT NULL where emptiness would lie — these are not bureaucracy. They move bugs from production back to the insert statement, where they are cheap to fix.

## Keep it boring

Normalized tables, predictable timestamps, one clear owner per row. Boring schemas let interesting product work happen on top of them. Save your cleverness for the features, not the DDL.`,
  },
  {
    category: "craft",
    title: "Reading code like a proofreader",
    status: "published",
    excerpt:
      "You do not read a pull request the way you read a novel. You read it the way an editor reads a manuscript — for what is missing.",
    body: `When a review stalls on style nits while a race condition sails through, the team has trained itself to notice the wrong things. Code review is an editorial practice, and editors have a method.

## Read for omissions first

What is not in the diff? The error path, the empty state, the second concurrent request. Ask those questions before you comment on variable names. Missing logic is expensive; naming is a five-second fix later.

## Trace one real request

Pick a single user action and follow it through the change end to end. If you cannot hold the whole path in your head, the change is either too large or too unclear — both are review findings.

## Leave the manuscript better than you found it

One or two substantive comments beat a wall of trivia. If every line is flagged, nothing is. Prioritize the comment that would prevent a bug, then stop.`,
  },
  {
    category: "systems",
    title: "Latency is a design material",
    status: "published",
    excerpt:
      "Network calls are not an implementation detail you bolt on later. They shape the interface long before you measure them.",
    body: `Every request you add to a page is a small bet that the network will cooperate. Sometimes it will not. Treating latency as a material — something with weight and cost — changes how you draw screens.

## Count the round trips

A dashboard that fires eight parallel calls feels slower than one call that returns a shaped payload, even when the total bytes are identical. Fewer, fatter requests often win on perceived speed.

## Design the waiting room

Skeletons, optimistic updates, and honest progress labels are not decoration. They are the interface for the time you cannot eliminate. An empty spinner with no explanation is an apology without words.

## Measure on a bad day

Test on a throttled connection, not just localhost. If the layout only feels right at full speed, it is not finished.`,
  },
  {
    category: "notes",
    title: "Small tools, sharp edges",
    status: "published",
    excerpt:
      "A script you trust beats a platform you tolerate. Notes on keeping personal tooling honest and short-lived.",
    body: `Personal tooling fails in a specific way: it accretes until nobody, including its author, wants to touch it. The fix is not more abstraction. It is giving every script a short lease.

## Write the readme first

If you cannot say in one sentence what the tool does and when to delete it, you do not need the tool yet. Clarity at the start prevents a graveyard of half-used helpers.

## One job, one file

A setup script that also formats code and checks for updates will eventually do none of them well. Split aggressively; merge only when the duplication actually hurts.

## Delete on schedule

Put a date in the header comment. When the date passes, either renew it consciously or remove the file. Tools that cannot die become the ones everyone quietly avoids.`,
  },
  {
    category: "databases",
    title: "Migrations without the drama",
    status: "published",
    excerpt:
      "Schema changes go wrong for predictable reasons. A short checklist keeps deploys boring — which is the point.",
    body: `The scariest migrations are not the complex ones. They are the ones nobody rehearsed. Treat every schema change like a procedure, not an improvisation.

## Expand, then contract

Add the new column or table first, ship code that reads and writes both shapes, then remove the old path in a later deploy. Two dull releases beat one clever one.

## Make it reversible

Every migration should have a documented way back. If reversing it is impossible, that is a design conversation, not a script problem.

## Watch the locks

Adding a NOT NULL with a default, backfilling a large table, dropping an index the API still needs — these are the moments that page you at 2 a.m. Batch the work, and test on a copy that has real row counts.`,
  },
  {
    category: "craft",
    title: "Writing docs for the person who is already late",
    status: "draft",
    excerpt:
      "Docs fail when they explain the system to its authors. Write instead for the reader who arrives mid-incident.",
    body: `Nobody reads documentation casually. They arrive with a task, a deadline, or an outage. That reader has no patience for a tour of the architecture — they need the one command, the one flag, the one place the answer lives.

## Lead with the action

Put the command at the top. Context can follow. If the first paragraph does not help someone do something, move it below the fold or delete it.

## Show the failure too

Document the error message they will actually see, not the idealized path. A short "if you see X, check Y" section saves more time than another paragraph of background.

## Keep it near the code

Docs that drift from the repository rot fastest. Place them where the change happens, and review them in the same pull request.`,
  },
];

function readingMinutes(body) {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function seed() {
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(schema);
  console.log("Schema applied.");

  const catIds = {};
  for (const c of categories) {
    const { rows } = await pool.query(
      "INSERT INTO categories (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id",
      [c.name, c.slug]
    );
    catIds[c.slug] = rows[0].id;
  }
  console.log(`Seeded ${categories.length} categories.`);

  let i = posts.length;
  for (const p of posts) {
    const publishedAt = p.status === "published" ? new Date(Date.now() - i * 86400000 * 3) : null;
    await pool.query(
      `INSERT INTO posts (category_id, title, slug, excerpt, body, status, reading_minutes, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (slug) DO UPDATE SET
         excerpt = EXCLUDED.excerpt,
         body = EXCLUDED.body,
         status = EXCLUDED.status,
         reading_minutes = EXCLUDED.reading_minutes,
         updated_at = now()`,
      [
        catIds[p.category],
        p.title,
        slugify(p.title),
        p.excerpt,
        p.body,
        p.status,
        readingMinutes(p.body),
        publishedAt,
      ]
    );
    i--;
  }
  console.log(`Seeded ${posts.length} posts.`);

  const { rows } = await pool.query("SELECT count(*)::int AS n FROM posts");
  console.log(`Done. Posts in database: ${rows[0].n}`);
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
