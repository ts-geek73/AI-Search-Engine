-- Enable extensions needed by this project.
create extension if not exists pgcrypto;
create extension if not exists vector;

-- Create a default bucket for uploaded docs.
insert into storage.buckets (id, name, public)
values ('docs', 'docs', true)
on conflict (id) do nothing;

-- Stores uploaded file metadata and optional vector embedding.
create table if not exists public.docs (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  bucket_key text not null unique,
  file_url text not null,
  embedded_data vector(1536),
  created_at timestamptz not null default now()
);

alter table public.docs enable row level security;

-- Default read policy for public URLs/listing.
drop policy if exists "docs_select_all" on public.docs;
create policy "docs_select_all"
on public.docs
for select
to public
using (true);

-- Writes should happen from server-side API (service role key).
