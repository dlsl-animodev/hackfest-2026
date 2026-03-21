create table if not exists public.workplace_sessions (
  session_id text primary key,
  query text not null,
  selected_source_ids text[] not null default '{}'::text[],
  analysis_payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists workplace_sessions_created_at_idx
  on public.workplace_sessions (created_at desc);
