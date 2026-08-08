# Progress Tracker — Backend

Node.js + Express + MongoDB (Mongoose) REST API for the Progress Tracker app.
See [`../docs/BACKEND_DESIGN.md`](../docs/BACKEND_DESIGN.md) for the full design and
[`../docs/IMPLEMENTATION_PLAN.md`](../docs/IMPLEMENTATION_PLAN.md) for phase status.

## Setup

```bash
npm install
cp .env.example .env     # then paste your hosted MongoDB URI into MONGO_URI
npm run dev              # start on http://localhost:4000 (nodemon)
```

> Uses a **hosted MongoDB** (e.g. Atlas). Set `MONGO_URI` in `.env` before starting.

## Scripts

| Script             | What it does                                        |
| ------------------ | --------------------------------------------------- |
| `npm run dev`      | Start with nodemon (auto-reload)                    |
| `npm start`        | Start once with node                                |
| `npm run seed`     | Seed the Super Admin                                |
| `npm run seed:demo`| Seed demo managers/contractors/projects for a demo  |
| `npm run db:reset` | **Wipe every record** so testing can start fresh    |

### Resetting for a fresh round of testing

`npm run db:reset` on its own is a **dry run** — it prints the target database and what it
would delete, and changes nothing. To actually wipe, spell out the database name:

```bash
npm run db:reset                                # dry run — safe
node scripts/reset-db.js --confirm=<db-name>    # wipe, then re-create the Super Admin
node scripts/reset-db.js --confirm=<db> --uploads   # also delete stored files
node scripts/reset-db.js --confirm=<db> --no-seed   # leave the database completely empty
```

Having to type the database name is deliberate: it stops you wiping the wrong environment by
re-running a shell command.

> **This is irreversible and there is no backup step.** Take a dump first if the data matters:
> `mongodump --uri "$MONGO_URI"`.
>
> The app has **no public sign-up**, so the Super Admin is re-created from `SEED_SUPERADMIN_*`
> in `.env` unless you pass `--no-seed`. Check `SEED_SUPERADMIN_PASSWORD` is what you intend
> before handing logins to testers — everyone else is created from inside the app by the
> Super Admin.

## Health check

```
GET /api/v1/health  ->  { "data": { "status": "ok", "uptime": <seconds> } }
```

## Structure

```
src/
├── server.js        boot (connect DB, then listen)
├── app.js           express app (middleware + routes + error handling)
├── config/          env + db connection
├── routes/          API routes mounted under /api/v1
├── middleware/      error handler, 404 (auth/rbac/upload added later)
└── utils/           ApiError, asyncHandler, response envelope
```
