<div align="center">

# Salon & Parlour Booking Platform

**Find a salon, book a slot, skip the wait.**
A bilingual (English / বাংলা) booking platform for salons and parlours in Bangladesh.

[Live demo](https://salon-platform.sheikhshoumik64.workers.dev/) · [API conventions](docs/api-conventions.md) · [Workflow](docs/workflow.md)

![React](https://img.shields.io/badge/React-Vite%20%2B%20TypeScript-61dafb?style=flat-square)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=flat-square)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20Postgres-3ecf8e?style=flat-square)
![Languages](https://img.shields.io/badge/UI-English%20%7C%20%E0%A6%AC%E0%A6%BE%E0%A6%82%E0%A6%B2%E0%A6%BE-c9a84c?style=flat-square)
![Cost](https://img.shields.io/badge/hosting-zero%20cost-brightgreen?style=flat-square)

</div>

---

## Why this exists

Many salons and parlours in Bangladesh still take bookings by phone calls, Facebook messages and walk-ins. That leads to double bookings, missed appointments, long waits and no clear view of prices or quality. This platform puts the whole flow in one place:

- **Customers** find nearby shops, see real availability, pay and follow a live queue.
- **Shop owners** run services, staff, bookings and walk-ins from a phone.
- **Staff** see their own bookings and update status with a few taps.
- **Administrators** approve shops, moderate reviews and oversee the platform.

It is our final-year project (B.Sc. Software Engineering, Daffodil International University), and everything is built on free tiers.

## Features

| Area | What you can do |
|---|---|
| **Discovery** | Nearby shops in a list or on a map, search and filter by price, rating, distance, gender category, offers and open-now, shop gallery and virtual tour |
| **Booking** | Choose one or more services and a staff member, pick a free slot, apply an offer, confirm. Double booking is blocked by the database itself |
| **Booking management** | Upcoming and past bookings, reschedule, cancel, owner accept or reject, status updates (arrived, in service, completed, no-show) |
| **Arrival confirmation** | The customer confirms before the visit; unconfirmed slots are released; repeated no-shows get a warning |
| **Live queue** | Online and walk-in customers in one queue, with the number ahead and an estimated wait |
| **Payments** | Deposit, full payment or pay-at-shop through bKash, Nagad or card (SSLCommerz sandbox), receipts and refunds |
| **Reviews** | Star ratings after a completed visit, with replies from the shop |
| **Owner tools** | Shop profile and documents, services, offers, staff schedules, dashboard and downloadable reports |
| **Admin tools** | Shop approval and suspension, review and dispute moderation with an audit log, commission plans, platform analytics |
| **Language** | Full English and Bengali interface, saved per user |

## Project status

The UI is built first on mock data, then each feature gets its database, API and tests, and its page is wired to the real API.

| Part | Status |
|---|---|
| Public pages, booking journey (services, slot, review, payment choice and confirmation), customer, owner and staff panels | Built on mock data |
| Receipt page and admin pages | Planned (UI phase) |
| Register, email OTP and login | **Real**, through Supabase Auth |
| Reset password, session in the header, log out, route guards | In progress |
| FastAPI backend, full database schema, payments, notifications | Planned |

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React, Vite, TypeScript, React Router, CSS Modules with design tokens, `react-i18next` |
| Maps | Leaflet and OpenStreetMap (no API key) |
| Backend | FastAPI (Python) |
| Database and auth | Supabase Postgres and Supabase Auth |
| Email | Brevo SMTP (6-digit codes) |
| Payments | SSLCommerz sandbox (bKash, Nagad, cards) |
| Hosting | Cloudflare Pages (frontend), Render (backend) |

Design notes: a dark and gold theme, mobile first (designed at 360 px), loading, empty and error states on every page, and a bilingual interface from the first page.

## Getting started

You need Node 24.14.1 and, for the backend, Python 3.14.

```bash
git clone https://github.com/shoumiksoul01/salon-platform.git
cd salon-platform/frontend
npm install
```

Create `frontend/.env` with your own Supabase project values. Use the publishable key only, never the secret key:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-key
```

```bash
npm run dev
```

The app runs without these keys, but register, OTP and login need them. Restart the dev server after changing `.env`.

**Useful commands**

```bash
npm run lint     # ESLint
npm run build    # type-check and production build
```

**Mock states.** Pages that use mock data support `?mock=empty` and `?mock=error` in the address during development, so you can see their empty and error states.

**Backend** (placeholder, only a health check so far):

```bash
cd backend
py -3.14 -m venv .venv
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

Then open `http://127.0.0.1:8000/health`. It returns `{"status":"ok"}`.

## Repository layout

```
salon-platform/
├── frontend/   React app: pages, layouts, components, api modules, mocks, locales
├── backend/    FastAPI service
├── ml/         optional smart features (kept empty until the core works)
└── docs/       API conventions, workflow, schema
```

Every page talks to a feature module in `frontend/src/api/`. Each module switches between mock and real data in one place, so wiring a page to the backend only swaps that module.

## Team contributions

Both of us work in this one repository and commit straight to `main` from our own GitHub accounts, in small steps, one commit per change. Commit count on 23 November 2026: Shoumik 37, Shomrat 33 (`git shortlog -sn --no-merges`). We review each other's commits after they are pushed. The rules are in [docs/workflow.md](docs/workflow.md), and a day-by-day log is in [JOURNAL.md](JOURNAL.md).

### Sk. Shoumik Haque ([@shoumiksoul01](https://github.com/shoumiksoul01)), repository owner

- **Setup:** repository, `.gitignore`, the `frontend`, `backend` and `ml` folders, the Vite React TypeScript app, the FastAPI backend with a `/health` endpoint, the workflow rules.
- **Design system:** design tokens, the dark and gold theme, bilingual setup (English and Bengali), the router, the shared component kit (buttons, forms, cards, modal, toast, tables, tabs, pagination).
- **Public site:** Home page with a video hero, shop results with list, map and filters, shop details with gallery and virtual tour, the For Shop Owners page.
- **Accounts:** register, email OTP and login wired to Supabase Auth (with Brevo email), reset password page.
- **Booking journey:** choose services and staff, pick a day and time (with staff names, next free day and time groups), review the booking, payment choice and booking confirmation.
- **Deployment:** the Cloudflare Pages deploy.
- **Next:** session and log out, reset password with Supabase, route guards, receipt page and the admin pages.

### Somrat Sheikh (Shomrat), collaborator

- **Setup:** collaboration workflow, API conventions (`docs/api-conventions.md`), the Node version file.
- **Layouts and shared components:** customer, owner and staff layouts, language switcher, map picker, status badge, weekly schedule editor, queue entry card.
- **Customer panel:** profile and language, my bookings with reschedule, cancel, confirm arrival and review dialogs, live queue, notifications.
- **Owner panel:** shop setup and documents, dashboard, services and offers, staff and availability, bookings, live queue.
- **Mock data:** fixtures for bookings, queue, notifications and staff schedules.
- **Next:** owner reviews, reports and media pages, staff pages, static pages, then the database schema and CI.

### Check the numbers yourself

Commit counts per person come straight from Git:

```bash
git shortlog -sn --no-merges
git log --oneline --author="Somrat"
git log --oneline --author="Shoumik"
```

## Project journal

[JOURNAL.md](JOURNAL.md) lists what each of us did, day by day, with the commit hashes.

## Contributing and conventions

- Commit messages follow `type(scope): short description`, for example `feat(ui): owner live queue`.
- Use design tokens only, never raw colours. Never commit `.env` files or keys.
- All text lives in `frontend/src/locales/en` and `frontend/src/locales/bn`, with identical keys in both.
- API rules (snake_case JSON, UUID ids, UTC times, money in integer poisha) are in [docs/api-conventions.md](docs/api-conventions.md).

## Roadmap

1. Finish the auth flow: reset password, session, log out and route guards.
2. Finish the remaining UI: receipt page and admin pages.
3. Backend and database for shops, services, staff and the booking engine.
4. Payments and refunds, arrival confirmation, live queue, reviews.
5. Reports, admin tools, testing and deployment.

## Acknowledgements

Built at Daffodil International University, Dhaka. Map data from OpenStreetMap contributors.
