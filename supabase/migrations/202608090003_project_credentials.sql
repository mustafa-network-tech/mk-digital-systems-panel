create table project_credentials (
  id uuid primary key default gen_random_uuid(),project_id uuid not null unique references projects on delete cascade,
  account_email text,supabase_password_encrypted text,notes text,
  created_by uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on project_credentials for each row execute function update_updated_at();
alter table project_credentials enable row level security;
create policy "own project credentials" on project_credentials for all to authenticated using(created_by=auth.uid()) with check(created_by=auth.uid());
