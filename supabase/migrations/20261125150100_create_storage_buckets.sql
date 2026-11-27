-- FR-01.1 and FR-01.4: storage buckets for shop files.
-- Only the FastAPI backend (service role key) reads and writes it. The bucket is not
-- public and no storage policy is added, so the browser cannot list or download files.
-- The API hands out short-lived signed links instead.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shop-documents',
  'shop-documents',
  false,
  5242880,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

-- FR-01.4: public bucket for the shop photos shown on the shop page. Anyone can open a
-- photo by its link; only the backend (service role key) can add or remove files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shop-images',
  'shop-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;
