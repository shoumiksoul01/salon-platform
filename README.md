# Salon & Parlour Booking Platform

A web and mobile booking platform for salons and parlours in Bangladesh. Customers find nearby shops, book a service and time slot, join a live queue and pay online. Shop owners manage services, staff, bookings and the queue. Admins approve shops.

University project by **Sk. Shoumik Haque** and **Somrat Sheikh (Shomrat)**.

## Tech stack

- Frontend: React + TypeScript (Vite), English and Bengali (i18n)
- Backend: FastAPI (Python)
- Demo: deployed on Cloudflare Pages
- Repo layout: `frontend/`, `backend/`, `ml/`, `docs/`

## Team contributions

Commit count on 23 November 2026: Shoumik 37, Shomrat 33 (`git shortlog -sn --no-merges`).

### Sk. Shoumik Haque (repo owner)
- Project setup: repo structure, Vite + React + TypeScript frontend, FastAPI backend with `/health`, design tokens, English/Bengali i18n, Cloudflare Pages deploy and first demo link
- Router, route files and the shared UI kit (Button, Input, Select, Checkbox, FormField, Card, Badge, Modal, Toast, Table, Tabs, Pagination, StatTile, EmptyState, Skeleton)
- Public and admin layouts; mock fixtures for shops, services, offers and reviews
- Public and customer pages: Home (with hero video), shop results with map view, shop details with gallery and virtual tour, For Shop Owners page, register, OTP, login, reset password
- Booking flow: choose services and staff, pick a day and time, review booking, payment choice and booking confirmation
- Dark and gold theme with the new navbar and header; updated collaboration workflow

### Somrat Sheikh (Shomrat)
- Collaboration workflow, API conventions and Node version file
- Customer, owner and staff layouts; language switcher; profile and language page
- Shared components: StatusBadge, WeekScheduleEditor, QueueEntryCard
- Mock fixtures for bookings, queue, notifications and staff
- Customer pages: My bookings (with reschedule, cancel, confirm arrival and review), live queue, notifications
- Owner panel: shop setup with hours, map pin, licence upload and approval status; dashboard; services and offers; staff and availability; bookings; live queue with walk-ins

The full day-by-day record is in [`JOURNAL.md`](JOURNAL.md).

## Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Pages use mock data for now (`USE_MOCK = true`); the backend is connected in later phases.
