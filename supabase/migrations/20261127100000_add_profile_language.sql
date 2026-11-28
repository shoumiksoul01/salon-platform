-- C-07: the language a user chose (Bengali or English), kept for later sessions.
-- null means "not chosen yet": the interface then follows the browser language.
--
-- No update policy is added on purpose. The profile page (C-05) saves through the
-- FastAPI backend (PATCH /api/v1/me), which lets a user change only their name,
-- phone and language, never the role.

alter table public.profiles
  add column if not exists preferred_language text
    check (preferred_language in ('bn', 'en'));
