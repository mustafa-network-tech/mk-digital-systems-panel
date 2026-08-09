alter table projects add column if not exists uses_supabase boolean not null default true;
create index if not exists projects_uses_supabase_idx on projects(uses_supabase);
