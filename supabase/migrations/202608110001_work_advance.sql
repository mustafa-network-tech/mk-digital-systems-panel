create table work_advances (
  id uuid primary key default gen_random_uuid(),
  advance_date date not null,
  amount numeric(14,2) not null check (amount > 0),
  description text,
  created_by uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table work_advance_expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null,
  description text not null,
  amount numeric(14,2) not null check (amount > 0),
  created_by uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table work_advance_receipts (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references work_advance_expenses on delete cascade,
  file_path text not null unique,
  created_by uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

create index work_advances_user_date_idx on work_advances(created_by, advance_date desc);
create index work_advance_expenses_user_date_idx on work_advance_expenses(created_by, expense_date desc);
create index work_advance_receipts_expense_idx on work_advance_receipts(expense_id);
create trigger set_updated_at before update on work_advances for each row execute function update_updated_at();
create trigger set_updated_at before update on work_advance_expenses for each row execute function update_updated_at();

alter table work_advances enable row level security;
alter table work_advance_expenses enable row level security;
alter table work_advance_receipts enable row level security;
create policy "own work advances" on work_advances for all to authenticated using (created_by=auth.uid()) with check (created_by=auth.uid());
create policy "own work advance expenses" on work_advance_expenses for all to authenticated using (created_by=auth.uid()) with check (created_by=auth.uid());
create policy "own work advance receipts" on work_advance_receipts for all to authenticated using (created_by=auth.uid()) with check (created_by=auth.uid());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('work-advance-receipts','work-advance-receipts',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

create policy "own work receipt reads" on storage.objects for select to authenticated
using (bucket_id='work-advance-receipts' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "own work receipt uploads" on storage.objects for insert to authenticated
with check (bucket_id='work-advance-receipts' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "own work receipt updates" on storage.objects for update to authenticated
using (bucket_id='work-advance-receipts' and (storage.foldername(name))[1]=auth.uid()::text)
with check (bucket_id='work-advance-receipts' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "own work receipt deletes" on storage.objects for delete to authenticated
using (bucket_id='work-advance-receipts' and (storage.foldername(name))[1]=auth.uid()::text);
