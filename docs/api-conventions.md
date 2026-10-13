# API Conventions

Rules for every endpoint and every response in the Salon Platform API. Both of us follow them, so the frontend, the mock data, and the backend always match.

## Base

- Base path: `/api/v1`. Example: `GET /api/v1/shops`.
- The health check stays outside the prefix: `GET /health`.
- Format: JSON in, JSON out. Header: `Content-Type: application/json`.
- The OpenAPI spec that FastAPI generates at `/docs` is the contract between the frontend and the backend.

## Naming

- Paths: lowercase, plural nouns, kebab-case. Examples: `/shops`, `/shops/{shop_id}/services`, `/bookings/{booking_id}`.
- Actions that are not plain create, read, update, or delete use a sub-path: `POST /bookings/{booking_id}/cancel`.
- JSON fields: `snake_case`. Example: `shop_id`, `starts_at`.
- HTTP methods: `GET` read, `POST` create, `PATCH` partial update, `DELETE` remove.

## Data formats

| Kind | Rule | Example |
|---|---|---|
| IDs | UUID string | `"3f2b8c1e-5d4a-4e7b-9c21-8a7d6e5f4b3a"` |
| Dates and times | ISO 8601, in UTC, with `Z` | `"2026-11-02T08:30:00Z"` |
| Dates only | `YYYY-MM-DD` | `"2026-11-02"` |
| Money | Integer in poisha (100 poisha = 1 taka), field name ends with `_poisha` | `"price_poisha": 25000` |
| Booleans | `true` or `false` | `"is_active": true` |

The server stores and returns UTC. The frontend shows times in Asia/Dhaka.

## Fixed values

| Field | Allowed values |
|---|---|
| `role` | `customer`, `shop_owner`, `staff`, `admin` |
| booking `status` | `pending`, `confirmed`, `arrived`, `in_service`, `completed`, `cancelled`, `no_show` |
| payment `status` | `pending`, `paid`, `failed`, `refunded` |

## Authentication

- Send the token in the header: `Authorization: Bearer <token>`.
- The server checks the user's role on every protected endpoint. The frontend hiding a button is not security.
- A user can only see and change their own data, unless their role allows more.

## Lists: pagination, sorting, filtering

- Query parameters: `limit` (default 20, maximum 100) and `offset` (default 0).
- Sorting: `sort=field` for ascending, `sort=-field` for descending. Example: `sort=-created_at`.
- Filters are plain query parameters. Example: `GET /shops?gender_category=ladies&open_now=true`.
- Every list response has this shape:

```json
{
  "items": [],
  "total": 0,
  "limit": 20,
  "offset": 0
}
```

## Status codes

| Code | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 204 | Done, no content |
| 400 | Bad request |
| 401 | Not logged in or token invalid |
| 403 | Logged in but not allowed |
| 404 | Not found |
| 409 | Conflict (for example the slot is already booked) |
| 422 | Validation error (FastAPI default) |
| 500 | Server error |

## Errors

Every error uses FastAPI's `detail` field, plus a machine-readable `code` that the frontend can translate into Bengali or English.

```json
{
  "detail": "This slot is no longer available",
  "code": "slot_taken"
}
```

Validation errors (422) keep FastAPI's default shape.

## Mock data and the real API

- The frontend calls only the functions in `frontend/src/api/<feature>.ts`. Pages never import mock data.
- Each API module has a mock path and a real path, switched by `USE_MOCK` at the top of the file.
- The mock data in `frontend/src/mocks/` has exactly the same shape as the real response described here and in `docs/schema.sql`.
- If the real endpoint needs a different shape, change the mock first in its own commit and tell the page owner.

## Other rules

- CORS: the backend allows only the frontend origin, read from an environment variable.
- Secrets live in `.env` files that are never committed. `.env.example` lists variable names only.
- Every new endpoint has a request schema, a response schema, and at least one test.