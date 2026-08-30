-- Additive category tree for the project explorer.
-- This migration deliberately does not update or classify any existing project.

create table if not exists project_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  parent_id uuid references project_categories(id) on delete restrict,
  project_group text not null check (project_group in ('customer_project','portfolio')),
  customer_status project_status,
  category_type text check (category_type is null or category_type in ('panel','application','website','game','test_work')),
  system_key text unique,
  sort_order integer not null default 0,
  created_by uuid references auth.users,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_categories_customer_status_scope check (
    (project_group = 'portfolio' and customer_status is null)
    or (project_group = 'customer_project' and customer_status in ('beklemede','tamamlandi','test'))
  ),
  constraint project_categories_sibling_name_unique unique nulls not distinct
    (parent_id, project_group, customer_status, name)
);

alter table projects
  add column if not exists project_category_id uuid references project_categories(id) on delete restrict;

alter table projects drop constraint if exists projects_category_check;
alter table projects add constraint projects_category_check
  check (category is null or category in ('panel','application','website','game','test_work'));

create index if not exists project_categories_parent_idx on project_categories(parent_id, sort_order, name);
create index if not exists project_categories_scope_idx on project_categories(project_group, customer_status);
create index if not exists projects_project_category_idx on projects(project_category_id);

create trigger set_project_categories_updated_at
  before update on project_categories
  for each row execute function update_updated_at();

alter table project_categories enable row level security;
create policy "authenticated full access" on project_categories
  for all to authenticated using (true) with check (true);

insert into project_categories(name, project_group, customer_status, category_type, system_key, sort_order)
values
  ('Web Siteleri','portfolio',null,'website','portfolio.website',10),
  ('Uygulamalar','portfolio',null,'application','portfolio.application',20),
  ('Paneller','portfolio',null,'panel','portfolio.panel',30),
  ('Oyunlar','portfolio',null,'game','portfolio.game',40),
  ('Test Çalışmaları','portfolio',null,'test_work','portfolio.test_work',50),
  ('Bekleyen','customer_project','beklemede',null,'customer.waiting',10),
  ('Tamamlanan','customer_project','tamamlandi',null,'customer.completed',20),
  ('Test Aşaması','customer_project','test',null,'customer.testing',30)
on conflict (system_key) do nothing;

insert into project_categories(name, parent_id, project_group, customer_status, category_type, system_key, sort_order)
select item.name, parent.id, 'customer_project', item.status::project_status, item.category_type, item.system_key, item.sort_order
from (values
  ('Bekleyen','beklemede','Web Siteleri','website','customer.waiting.website',10),
  ('Bekleyen','beklemede','Uygulamalar','application','customer.waiting.application',20),
  ('Bekleyen','beklemede','Paneller','panel','customer.waiting.panel',30),
  ('Bekleyen','beklemede','Oyunlar','game','customer.waiting.game',40),
  ('Tamamlanan','tamamlandi','Web Siteleri','website','customer.completed.website',10),
  ('Tamamlanan','tamamlandi','Uygulamalar','application','customer.completed.application',20),
  ('Tamamlanan','tamamlandi','Paneller','panel','customer.completed.panel',30),
  ('Tamamlanan','tamamlandi','Oyunlar','game','customer.completed.game',40),
  ('Test Aşaması','test','Web Siteleri','website','customer.testing.website',10),
  ('Test Aşaması','test','Uygulamalar','application','customer.testing.application',20),
  ('Test Aşaması','test','Paneller','panel','customer.testing.panel',30),
  ('Test Aşaması','test','Oyunlar','game','customer.testing.game',40)
) as item(parent_name,status,name,category_type,system_key,sort_order)
join project_categories parent on parent.name=item.parent_name and parent.parent_id is null and parent.project_group='customer_project'
on conflict (system_key) do nothing;

comment on column projects.project_category_id is 'Optional category-tree assignment. Existing project rows intentionally remain null.';
