-- Enable extensions needed by this project.
create extension if not exists pgcrypto;

create extension if not exists vector;

-- Create a default bucket for uploaded docs.
insert into
  storage.buckets (id, name, public)
values
  ('docs', 'docs', true) on conflict (id) do nothing;

-- Stores uploaded file metadata and optional vector embedding.
DROP TABLE public.docs CASCADE;

create table
  if not exists public.docs (
    id uuid primary key default gen_random_uuid (),
    file_name text not null,
    bucket_key text not null unique,
    file_url text not null,
    created_at timestamptz not null default now ()
  );

create table
  if not exists public.doc_chunks (
    id uuid primary key default gen_random_uuid (),
    doc_id uuid not null references public.docs (id) on delete cascade,
    chunk_index integer not null,
    title text,
    content text not null,
    embedding vector (3072), -- match your Gemini model's actual output dimension
    created_at timestamptz not null default now ()
  );

alter table public.docs enable row level security;

-- Default read policy for public URLs/listing.
drop policy if exists "docs_select_all" on public.docs;

create policy "docs_select_all" on public.docs for
select
  to public using (true);

-- Writes should happen from server-side API (service role key).

create or replace function match_doc_chunks(
  query_embedding vector(3072),
  match_count int default 8,
  match_threshold float default 0.5
)
returns table (
  id uuid,
  doc_id uuid,
  chunk_index int,
  title text,
  content text,
  similarity float
)
language sql stable
as $$
  select
    id,
    doc_id,
    chunk_index,
    title,
    content,
    1 - (embedding <=> query_embedding) as similarity
  from doc_chunks
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;

create or replace function match_doc_chunks_subset(
  query_embedding vector(3072),
  candidate_ids uuid[],
  match_count int default 8,
  match_threshold float default 0.5
)
returns table (
  id uuid,
  doc_id uuid,
  chunk_index int,
  title text,
  content text,
  similarity float
)
language sql stable
as $$
  select
    id,
    doc_id,
    chunk_index,
    title,
    content,
    1 - (embedding <=> query_embedding) as similarity
  from doc_chunks
  where
    id = any(candidate_ids)
    and 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;
