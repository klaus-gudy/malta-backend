# Malta LMS — Backend API

NestJS (modular monolith) backend for the Malta Microfinance Loan Management
System frontend. PostgreSQL via Docker, TypeORM, and a deterministic seeder that
loads the same demo dataset the frontend was built against.

## Architecture

A module per business domain, each owning its entity, DTOs, service and controller:

| Module          | Routes (prefix `/api`)                                                                 | Frontend page(s)              |
| --------------- | ------------------------------------------------------------------------------------- | ----------------------------- |
| `auth`          | `GET /auth/roles`, `POST /auth/login`                                                  | Login / role switcher         |
| `customers`     | `GET/POST /customers`, `GET /customers/:id`, `GET /customers/:id/documents`, `PATCH /customers/:id/kyc`, `PATCH /customers/documents/:docId/status` | Customers, KYC |
| `products`      | `GET/POST /products`, `GET /products/:id`, `PATCH /products/:id`                       | Loan Products                 |
| `applications`  | `GET/POST /applications`, `GET /applications/:id`, `PATCH /applications/:id`           | Applications, Approvals       |
| `loans`         | `GET /loans`, `GET /loans/:id`, `POST /loans/disburse`, `POST /loans/:id/payments`     | Loan Accounts, Disbursements, Collections |
| `users`         | `GET/POST /users`, `GET /users/:id`, `PATCH /users/:id`, `PATCH /users/:id/toggle`     | User Management               |
| `audit`         | `GET /audit/:entityId`                                                                 | Application audit trail       |

All routes are under the global prefix **`/api`**. Health check at `GET /api/health`.

## Quick start

### Option A — full stack in Docker (API + Postgres + Adminer)

```bash
cp .env.example .env          # defaults already match docker-compose
docker compose up -d --build  # builds the API image, starts everything
```

- API → http://localhost:3030
- Adminer (DB UI) → http://localhost:8080
- Postgres → host port **5433** (container-internal 5432)

The API container reaches Postgres over the compose network as `postgres:5432`;
the `5433` host mapping is only for connecting from your machine (a local
Postgres already occupies 5432).

### Option B — API on the host, Postgres in Docker (for local dev / watch mode)

```bash
npm install
cp .env.example .env
docker compose up -d postgres   # just the database
npm run start:dev               # API with hot reload
```

The API listens on **http://localhost:3030** (configurable via `PORT`) and seeds
demo data on first boot.

```bash
curl http://localhost:3030/api/health
curl http://localhost:3030/api/customers
curl -X POST http://localhost:3030/api/auth/login -H 'Content-Type: application/json' -d '{"role":"manager"}'
```

## Configuration (`.env`)

| Variable                       | Default                 | Purpose                                          |
| ------------------------------ | ----------------------- | ------------------------------------------------ |
| `PORT`                         | `3030`                  | API port                                         |
| `CORS_ORIGIN`                  | `http://localhost:3000` | Comma-separated allowed origins (the frontend)   |
| `DB_HOST` / `DB_PORT`          | `localhost` / `5433`    | Postgres connection                              |
| `DB_USERNAME` / `DB_PASSWORD`  | `malta` / `malta`       | Postgres credentials (match docker-compose)      |
| `DB_DATABASE`                  | `malta_lms`             | Database name                                    |
| `DB_SYNCHRONIZE`               | `true`                  | TypeORM auto-creates schema (dev only)           |
| `DB_SEED`                      | `true`                  | Seed demo data when tables are empty             |

## Notes

- **Validation** — all request bodies are validated/whitelisted via `class-validator` DTOs; unknown fields are rejected (HTTP 400).
- **IDs** mirror the frontend scheme (`CUS-…`, `PRD-…`, `LAP-…`, `LN-…`, `U-…`) so responses are drop-in compatible.
- **Disbursement** (`POST /loans/disburse`) materialises a loan from an approved application and flips the application to `Disbursed`, matching the frontend's `disburse()` mutation.
- **Auth** is role-based only (no passwords) — this mirrors the demo frontend, which logs in by selecting a role. Add real auth (JWT/guards) before production.
- For production, disable `DB_SYNCHRONIZE` and use TypeORM migrations instead.

## Connecting the frontend

Point the Next.js app at this API (e.g. `NEXT_PUBLIC_API_URL=http://localhost:3030/api`)
and replace the in-memory calls in `lib/api.ts` with `fetch` calls to the matching
routes above. The response shapes already match `lib/types.ts`.
```
