create table if not exists public.query_cache (
  normalized_query text primary key,
  query text not null,
  expanded_query text,
  payload jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.work_cache (
  cache_key text primary key,
  doi text,
  semantic_scholar_paper_id text,
  openalex_id text,
  payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists work_cache_doi_idx
  on public.work_cache (doi)
  where doi is not null;

create unique index if not exists work_cache_semantic_scholar_paper_id_idx
  on public.work_cache (semantic_scholar_paper_id)
  where semantic_scholar_paper_id is not null;

create unique index if not exists work_cache_openalex_id_idx
  on public.work_cache (openalex_id)
  where openalex_id is not null;

create table if not exists public.retraction_cache (
  doi text primary key,
  status text not null,
  payload jsonb,
  checked_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.analysis_cache (
  selection_hash text primary key,
  normalized_query text not null,
  source_ids text[] not null default '{}'::text[],
  model text not null,
  payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
