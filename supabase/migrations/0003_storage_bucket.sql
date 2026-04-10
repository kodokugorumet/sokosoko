-- ============================================================================
-- 0003_storage_bucket: Phase 2-G post cover images
-- ============================================================================
-- Creates a public Supabase Storage bucket for post cover images and sets up
-- the minimum set of RLS policies for upload/read/delete.
--
-- The bucket is public-read because cover images are part of published posts
-- and need to be reachable by search engines and social card fetchers
-- (Google, Twitter, Facebook, etc.). Only authenticated users with the
-- operator/admin role can upload; authors can delete their own uploads.
--
-- Idempotent: every create/policy is drop-and-create wrapped.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Bucket
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-covers',
  'post-covers',
  true, -- public read — required for OG images and search engine cards
  5 * 1024 * 1024, -- 5 MB per cover, more than enough for a compressed JPEG
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- Storage RLS policies
-- ----------------------------------------------------------------------------
-- Supabase's storage.objects table already has RLS enabled by default.
-- We scope every policy to bucket_id = 'post-covers' so other future
-- buckets aren't affected by these rules.

-- Read: anyone can GET a file in this bucket (public bucket).
drop policy if exists "post_covers_public_read" on storage.objects;
create policy "post_covers_public_read" on storage.objects
  for select
  using (bucket_id = 'post-covers');

-- Upload: operator/admin only. The file's owner column is set by Supabase
-- to auth.uid() automatically, which we can check on delete.
drop policy if exists "post_covers_operator_insert" on storage.objects;
create policy "post_covers_operator_insert" on storage.objects
  for insert
  with check (
    bucket_id = 'post-covers'
    and (select role from public.profiles where id = auth.uid()) in ('admin', 'operator')
  );

-- Update: operator/admin only. Mostly used for cache-buster metadata
-- changes; the file path is immutable.
drop policy if exists "post_covers_operator_update" on storage.objects;
create policy "post_covers_operator_update" on storage.objects
  for update
  using (
    bucket_id = 'post-covers'
    and (select role from public.profiles where id = auth.uid()) in ('admin', 'operator')
  );

-- Delete: the uploader can delete their own cover, OR admin can delete any.
-- owner = auth.uid() of whoever inserted the row.
drop policy if exists "post_covers_owner_delete" on storage.objects;
create policy "post_covers_owner_delete" on storage.objects
  for delete
  using (
    bucket_id = 'post-covers'
    and (
      owner = auth.uid()
      or (select role from public.profiles where id = auth.uid()) in ('admin', 'operator')
    )
  );
