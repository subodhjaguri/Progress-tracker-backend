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

| Script          | What it does                          |
| --------------- | ------------------------------------- |
| `npm run dev`   | Start with nodemon (auto-reload)      |
| `npm start`     | Start once with node                  |
| `npm run seed`  | Seed the Super Admin (from Phase 2)   |

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
