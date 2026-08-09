create type finance_category_type as enum ('income','expense');
create type installment_status as enum ('active','completed','overdue');

create table finance_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type finance_category_type not null,
  color text,
  created_by uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  unique(created_by, name, type)
);
create table finance_installments (
  id uuid primary key default gen_random_uuid(),
  name text not null,total_amount numeric(14,2) not null check(total_amount>0),
  installment_count integer not null check(installment_count>0),installment_amount numeric(14,2) not null check(installment_amount>0),
  paid_installment_count integer not null default 0 check(paid_installment_count>=0),
  start_date date not null,next_payment_date date,payment_day integer not null check(payment_day between 1 and 31),
  payment_method text,description text,status installment_status not null default 'active',
  created_by uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  check(paid_installment_count<=installment_count)
);
create table finance_income (
  id uuid primary key default gen_random_uuid(),amount numeric(14,2) not null check(amount>0),income_date date not null,
  category_id uuid references finance_categories on delete set null,source text,description text,recurring boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table finance_expenses (
  id uuid primary key default gen_random_uuid(),amount numeric(14,2) not null check(amount>0),expense_date date not null,
  category_id uuid references finance_categories on delete set null,payment_method text,description text,recurring boolean not null default false,
  installment_id uuid references finance_installments on delete set null,installment_sequence integer,
  created_by uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  unique(installment_id,installment_sequence)
);
create index finance_income_user_date_idx on finance_income(created_by,income_date desc);
create index finance_expenses_user_date_idx on finance_expenses(created_by,expense_date desc);
create index finance_installments_user_next_idx on finance_installments(created_by,status,next_payment_date);
create trigger set_updated_at before update on finance_income for each row execute function update_updated_at();
create trigger set_updated_at before update on finance_expenses for each row execute function update_updated_at();
create trigger set_updated_at before update on finance_installments for each row execute function update_updated_at();
alter table finance_categories enable row level security;alter table finance_income enable row level security;alter table finance_expenses enable row level security;alter table finance_installments enable row level security;
create policy "own categories" on finance_categories for all to authenticated using(created_by=auth.uid()) with check(created_by=auth.uid());
create policy "own income" on finance_income for all to authenticated using(created_by=auth.uid()) with check(created_by=auth.uid());
create policy "own expenses" on finance_expenses for all to authenticated using(created_by=auth.uid()) with check(created_by=auth.uid());
create policy "own installments" on finance_installments for all to authenticated using(created_by=auth.uid()) with check(created_by=auth.uid());

create or replace function pay_finance_installment(p_installment_id uuid,p_payment_date date default current_date)
returns void language plpgsql security invoker set search_path=public as $$
declare v finance_installments%rowtype;v_sequence integer;v_category uuid;
begin
 select * into v from finance_installments where id=p_installment_id and created_by=auth.uid() for update;
 if not found then raise exception 'Taksit bulunamadı';end if;
 if v.status='completed' or v.paid_installment_count>=v.installment_count then raise exception 'Taksit tamamlanmış';end if;
 v_sequence:=v.paid_installment_count+1;
 if exists(select 1 from finance_expenses where installment_id=v.id and installment_sequence=v_sequence) then raise exception 'Bu ödeme daha önce kaydedilmiş';end if;
 select id into v_category from finance_categories where created_by=auth.uid() and type='expense' and name='Taksit' limit 1;
 insert into finance_expenses(amount,expense_date,category_id,payment_method,description,installment_id,installment_sequence,created_by)
 values(v.installment_amount,p_payment_date,v_category,v.payment_method,v.name||' - '||v_sequence||'/'||v.installment_count,p_installment_id,v_sequence,auth.uid());
 update finance_installments set paid_installment_count=v_sequence,
   status=case when v_sequence>=installment_count then 'completed'::installment_status else 'active'::installment_status end,
   next_payment_date=case when v_sequence>=installment_count then null else (next_payment_date+interval '1 month')::date end
 where id=p_installment_id;
end;$$;
grant execute on function pay_finance_installment(uuid,date) to authenticated;
