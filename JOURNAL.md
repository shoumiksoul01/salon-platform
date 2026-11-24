# Project Journal

Day-by-day record of what each team member did, taken from the Git history (`git log`) up to 23 November 2026. Each entry lists the commits made that day.

Totals: Shoumik 37 commits, Shomrat 33 commits (70 in all) as of 23 November 2026. For the current numbers run `git shortlog -sn --no-merges`.

| Date | Author | What was done | Commits |
|---|---|---|---|
| 2026-10-06 | Shomrat | Add repo collaboration workflow | `86bb599` |
| 2026-10-12 | Shoumik | Update workflow to the full collaboration rules; Add root .gitignore; Add frontend, backend and ml folders; Scaffold Vite React TypeScript frontend; Scaffold FastAPI backend with /health endpoint; Add design tokens (colour, type, spacing, radius, motion); Add i18n setup with English and Bengali common strings | `62de152`, `42a0c57`, `63f0250`, `8c0f4f0`, `0643ae2`, `6a635eb`, `0731b9b` |
| 2026-10-13 | Shomrat | Add .node-version for Node 24.14.1; Add API conventions; Language switcher component | `0190d15`, `81ad0a2`, `b3de8a5` |
| 2026-10-13 | Shoumik | Add router, route files per layout and shared libraries; Shared kit 1: Button, Input, Select, Checkbox, FormField; Shared kit 2: Card, Badge, Modal, Toast; Shared kit 3: Table, Tabs, Pagination, StatTile, EmptyState, Skeleton | `18e05d4`, `a858f7f`, `97415c0`, `3a9a0d9` |
| 2026-10-14 | Shomrat | Profile and language page; Add @types/leaflet; Shop setup form with hours and map pin; Shop setup documents upload and approval status banner; Use div instead of main in profile and shop setup pages | `7130edd`, `06e2640`, `a472d9e`, `ea0854f`, `8d16e81` |
| 2026-10-14 | Shoumik | Public layout with header, language switch, footer and mobile menu; Admin layout (sidebar, topbar); Mock fixtures for shops, services, offers and reviews; Home page with hero search, nearby shops and featured offers; Add Cloudflare Pages deploy config and publish the first demo link; Add wrangler config for Cloudflare static assets and drop _redirects; Add compatibility_date to wrangler config | `e3b050a`, `07609ad`, `12fe9aa`, `f115dd1`, `1cfcd3d`, `7ffc287`, `9d0b8be` |
| 2026-10-15 | Shoumik | Shop results page with list, search box and filter panel | `e3aeb5e` |
| 2026-11-14 | Shomrat | Align shop setup data names with shared fixtures; Owner layout (sidebar on desktop, bottom nav on phone) | `184111b`, `7ca8976` |
| 2026-11-15 | Shomrat | Customer layout (header, bottom nav on phone); Staff layout (phone first, large touch targets) | `1b21f80`, `c3fc7b0` |
| 2026-11-16 | Shomrat | Mock fixtures for bookings, queue, notifications and staff | `9392f75` |
| 2026-11-17 | Shomrat | Align staff hours field names with shop hours; Finish staff hours field rename and make fixture times consistent; StatusBadge for booking, queue and payment statuses; WeekScheduleEditor component (hours, breaks, blocked time); QueueEntryCard component and dev preview of the shared components | `b10ab19`, `a32d665`, `00dc3fd`, `07fbb20`, `d4cc86e` |
| 2026-11-17 | Shoumik | Add payment method values and use women in the shops filter example; Add map view to shops page; Shop details page with services and offers; Shop gallery and virtual tour on the details page; For Shop Owners landing page; Register page with role choice | `1d92ecf`, `0f5786b`, `d364067`, `96dbe37`, `2c15e80`, `c25f35e` |
| 2026-11-18 | Shomrat | My bookings page with upcoming and past tabs | `bd49841` |
| 2026-11-19 | Shomrat | My bookings dialogs: reschedule, cancel, confirm arrival, review | `f20ad80` |
| 2026-11-20 | Shomrat | Customer live queue page | `6b63025` |
| 2026-11-20 | Shoumik | Dark and gold theme with a new navbar; Header with log in or sign up and list your business; Home hero with background video; Hero background video and poster | `b39f3ba`, `ba5ae43`, `0ca13b6`, `38c9204` |
| 2026-11-21 | Shoumik | OTP verification page; Login page; Reset password page | `5c784bb`, `2521913`, `b293408` |
| 2026-11-22 | Shomrat | Customer notifications page; Match customer, owner and staff headers to the gold navbar; Match staff header to the gold navbar; Owner dashboard numbers and today's bookings; Owner dashboard upcoming bookings and popular services | `985803c`, `f1d5447`, `cf4efdf`, `3092a01`, `62118c3` |
| 2026-11-22 | Shoumik | Choose services and staff page; Pick a day and time page; Staff names, next free day and time groups on slot page; Review booking page; Payment choice and booking confirmation | `544a96e`, `6363e90`, `b01a4aa`, `114bb0f`, `354da01` |
| 2026-11-23 | Shomrat | Owner services list with add, edit and deactivate; Owner offers tab with create, edit and end; Owner staff list with add, edit and service assignment; Owner staff availability with hours, breaks and blocked time; Owner bookings with requests, status updates and no-show; Owner live queue with walk-ins and check-in | `11126bc`, `f233739`, `e159368`, `5e382d1`, `9d18e97`, `0f3ce05` |
| 2026-11-24 | Shoumik | Chose Supabase Auth (email as the login id) and set up the dev project with Brevo email; Add supabase-js and env example; Supabase client module; Profiles table, role column and signup trigger; Wire register, OTP verify and login to Supabase | `7aff1c9`, `73e0a45`, `b3921b5`, `8401d36`, `408e873`, `7f45ed5` |

Notes for 24 November: register, OTP and login now run against Supabase and are no longer mock. The first signup timed out (504) because the email send to Brevo was slow, and it was fixed by changing the SMTP port. Supabase first sent 8-digit codes, so the OTP length was set to 6. Commit `c1b11e0` (README with team contributions and project journal) also landed between the 23 and 24 November work; its exact day was not checked. The first three Supabase commits are listed under 24 November, but their exact day was not verified, so correct this row with `git log --format="%h %ad %s" --date=short` if needed. Next: session and log out, reset password with Supabase, route guards.

Entries after 24 November 2026 are added in the same commit as the work.
