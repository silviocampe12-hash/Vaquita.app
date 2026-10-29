create table if not exists public.vaquita_groups (
  id text primary key,
  token_hash text not null unique,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vaquita_groups enable row level security;

revoke all on table public.vaquita_groups from public, anon, authenticated;
grant all on table public.vaquita_groups to service_role;

create index if not exists vaquita_groups_updated_at_idx
  on public.vaquita_groups (updated_at);

do $$
begin
  if to_regclass('public.groups') is not null then
    execute 'alter table public.groups enable row level security';
    execute 'revoke all on table public.groups from public, anon, authenticated';
  end if;
end
$$;
