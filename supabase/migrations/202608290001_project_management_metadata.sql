-- This migration is intentionally additive and must be reviewed before it is run.
-- It preserves every existing project row and every legacy column.

alter table projects
  add column if not exists project_group text,
  add column if not exists category text,
  add column if not exists short_description text,
  add column if not exists detailed_description text,
  add column if not exists local_source_path text,
  add column if not exists hosting_provider text,
  add column if not exists hosting_project_name text,
  add column if not exists hosting_status text,
  add column if not exists database_provider text,
  add column if not exists database_project_name text,
  add column if not exists database_safe_identifier text,
  add column if not exists last_deployment_at timestamptz,
  add column if not exists readme_content text,
  add column if not exists readme_source text,
  add column if not exists readme_hash text,
  add column if not exists readme_synced_at timestamptz;

update projects
set project_group = case when customer_id is null then 'portfolio' else 'customer_project' end
where project_group is null;

update projects
set detailed_description = description
where detailed_description is null and description is not null;

update projects
set hosting_provider = 'vercel',
    hosting_project_name = coalesce(hosting_project_name, vercel_project_name),
    hosting_status = coalesce(hosting_status, vercel_deploy_status),
    last_deployment_at = coalesce(last_deployment_at, vercel_last_deploy_date)
where hosting_provider is null
  and (vercel_project_name is not null or vercel_dashboard_url is not null or vercel_production_url is not null);

update projects
set database_provider = case when uses_supabase then 'supabase' else 'none' end,
    database_project_name = coalesce(database_project_name, supabase_project_name),
    database_safe_identifier = coalesce(database_safe_identifier, supabase_project_ref)
where database_provider is null;

alter table projects
  alter column project_group set default 'portfolio',
  add constraint projects_project_group_check
    check (project_group is null or project_group in ('customer_project','portfolio')),
  add constraint projects_category_check
    check (category is null or category in ('panel','application','website','game')),
  add constraint projects_hosting_provider_check
    check (hosting_provider is null or hosting_provider in ('vercel','cloudflare','other')),
  add constraint projects_database_provider_check
    check (database_provider is null or database_provider in ('supabase','cloudflare_d1','other','none'));

create index if not exists projects_group_idx on projects(project_group);
create index if not exists projects_category_idx on projects(category);
create index if not exists projects_hosting_status_idx on projects(hosting_status);

comment on column projects.local_source_path is 'Local source reference only. Never store credentials or .env values.';
comment on column projects.database_safe_identifier is 'Non-secret project identifier only; never an API key or service role key.';
comment on column projects.readme_content is 'A safe Markdown copy of the project README; secrets must be removed before saving.';
