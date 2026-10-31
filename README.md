# Quire

A small writing archive blog built for **DecodeLabs Full Stack Project 3 — Database Integration**.

Posts are stored permanently in **PostgreSQL**, served by an Express JSON API, and managed through a plain multi-page interface. No frameworks, no build step.

## Features

- **Two-table schema** — `categories` (1) ← `posts` (N) with a real foreign key, CHECK constraints, and indices
- **Full CRUD** — create, read, update, delete posts via `/api/posts` with server-side validation and parameterised queries
- **Draft / published workflow** — drafts stay on the desk; only published entries appear on the public index
- **Five pages** — index, article, about, editorial desk, editor
- **Seeded content** — five published essays and one draft so the site is never empty

## Stack

| Layer    | Choice                         |
| -------- | ------------------------------ |
| Server   | Node.js + Express 5            |
| Database | PostgreSQL (`pg`)              |
| Frontend | Vanilla HTML / CSS / fetch     |
| Config   | `dotenv` (`.env`)              |

## Setup

Requires Node.js 18+ and a running PostgreSQL instance.

```bash
# 1. Install dependencies
npm install

# 2. Configure the database
cp .env.example .env
# edit DATABASE_URL if your Postgres user/host/db differs

# 3. Create the database (once)
psql -U postgres -c "CREATE DATABASE quire;"

# 4. Apply schema + seed sample posts
npm run db:schema
npm run db:seed

# 5. Run
npm start
```

Open http://localhost:4000 — the desk is at `/admin.html`.

## API

| Method | Route                 | Description                       |
| ------ | --------------------- | --------------------------------- |
| GET    | `/api/posts`          | All posts (`?status=published`)   |
| GET    | `/api/posts/:slug`    | One post by slug                  |
| GET    | `/api/posts/id/:id`   | One post by id (editor)           |
| POST   | `/api/posts`          | Create a post                     |
| PUT    | `/api/posts/:id`      | Update a post (partial allowed)   |
| DELETE | `/api/posts/:id`      | Delete a post                     |
| GET    | `/api/categories`     | Sections with published counts    |
| GET    | `/api/stats`          | Total / published / draft counts  |

## Project structure

```
├── server.js          # Express app + API routes
├── seed.js            # Schema apply + sample content
├── schema.sql         # Table definitions
├── .env.example       # Config template
└── public/
    ├── index.html     # Home — featured entry + archive index
    ├── post.html      # Article reader (light markdown)
    ├── about.html     # Colophon
    ├── admin.html     # Editorial desk — list / delete
    ├── editor.html    # Create & edit form
    ├── 404.html
    ├── css/styles.css
    └── js/            # shared, home, post, admin, editor
```

## Design notes

The interface is built as an **accession index**: numbered entries, filed under a section, dated — like a working archive. Typography does the heavy lifting (Archivo, Newsreader, IBM Plex Mono); the only flourish is an ultramarine rule on hover.

## License

MIT
