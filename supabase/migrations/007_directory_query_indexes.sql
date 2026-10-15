-- Indexes for the public directory query shape used by the home page.
-- Trigram indexes keep substring search responsive without loading a large
-- result set into the browser.

create extension if not exists pg_trgm;

create index if not exists locations_public_category_created_idx
  on public.locations(status, category, created_at desc)
  where status in ('published','claimed');

create index if not exists locations_name_trgm_idx
  on public.locations using gin (name gin_trgm_ops);

create index if not exists locations_city_trgm_idx
  on public.locations using gin (city gin_trgm_ops);

create index if not exists locations_address_trgm_idx
  on public.locations using gin (address gin_trgm_ops);

create index if not exists locations_description_trgm_idx
  on public.locations using gin (description gin_trgm_ops);
