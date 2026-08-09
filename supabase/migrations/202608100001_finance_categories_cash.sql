alter table finance_categories add column if not exists is_active boolean not null default true;

create table finance_accounts(
 id uuid primary key default gen_random_uuid(),name text not null,balance numeric(14,2) not null default 0,
 is_active boolean not null default true,created_by uuid not null default auth.uid() references auth.users on delete cascade,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(created_by,name)
);
create type finance_cash_movement_type as enum('income','expense','transfer','adjustment');
create table finance_cash_movements(
 id uuid primary key default gen_random_uuid(),movement_date date not null default current_date,
 account_id uuid not null references finance_accounts on delete restrict,counterparty_account_id uuid references finance_accounts on delete restrict,
 movement_type finance_cash_movement_type not null,amount numeric(14,2) not null check(amount>0),balance_delta numeric(14,2) not null,description text,
 created_by uuid not null default auth.uid() references auth.users on delete cascade,created_at timestamptz not null default now()
);
create index finance_cash_movements_user_date_idx on finance_cash_movements(created_by,movement_date desc,created_at desc);
create trigger set_updated_at before update on finance_accounts for each row execute function update_updated_at();
alter table finance_accounts enable row level security;alter table finance_cash_movements enable row level security;
create policy "own finance accounts" on finance_accounts for all to authenticated using(created_by=auth.uid()) with check(created_by=auth.uid());
create policy "own cash movements" on finance_cash_movements for select to authenticated using(created_by=auth.uid());

create or replace function ensure_finance_defaults() returns void language plpgsql security invoker set search_path=public as $$
declare n text;
begin
 foreach n in array array['Kredi Kartı 1','Kredi Kartı 2','Cep Telefonu 1','Cep Telefonu 2','İnternet 1','İnternet 2','Kişisel Harcama','Yazılım Harcaması','Market','Ulaşım','Konaklama','Diğer','Taksit'] loop
  insert into finance_categories(name,type,created_by) values(n,'expense',auth.uid()) on conflict(created_by,name,type) do nothing;
 end loop;
 foreach n in array array['Telekom','Yazılım'] loop
  insert into finance_categories(name,type,created_by) values(n,'income',auth.uid()) on conflict(created_by,name,type) do nothing;
 end loop;
 foreach n in array array['Garanti','DenizBank','Nakit'] loop
  insert into finance_accounts(name,created_by) values(n,auth.uid()) on conflict(created_by,name) do nothing;
 end loop;
end;$$;
grant execute on function ensure_finance_defaults() to authenticated;

create or replace function adjust_finance_balance(p_account_id uuid,p_new_balance numeric,p_description text default null,p_date date default current_date)
returns void language plpgsql security invoker set search_path=public as $$
declare old_balance numeric;delta numeric;
begin
 select balance into old_balance from finance_accounts where id=p_account_id and created_by=auth.uid() for update;
 if not found then raise exception 'Hesap bulunamadı';end if;
 delta:=p_new_balance-old_balance;if delta=0 then return;end if;
 update finance_accounts set balance=p_new_balance where id=p_account_id;
 insert into finance_cash_movements(movement_date,account_id,movement_type,amount,balance_delta,description,created_by)
 values(p_date,p_account_id,'adjustment',abs(delta),delta,coalesce(p_description,'Manuel bakiye düzeltmesi'),auth.uid());
end;$$;
grant execute on function adjust_finance_balance(uuid,numeric,text,date) to authenticated;

create or replace function transfer_finance_balance(p_from uuid,p_to uuid,p_amount numeric,p_description text default null,p_date date default current_date)
returns void language plpgsql security invoker set search_path=public as $$
declare from_balance numeric;
begin
 if p_from=p_to or p_amount<=0 then raise exception 'Geçersiz transfer';end if;
 select balance into from_balance from finance_accounts where id=p_from and created_by=auth.uid() for update;
 if not found then raise exception 'Kaynak hesap bulunamadı';end if;if from_balance<p_amount then raise exception 'Yetersiz bakiye';end if;
 perform 1 from finance_accounts where id=p_to and created_by=auth.uid() for update;if not found then raise exception 'Hedef hesap bulunamadı';end if;
 update finance_accounts set balance=balance-p_amount where id=p_from;update finance_accounts set balance=balance+p_amount where id=p_to;
 insert into finance_cash_movements(movement_date,account_id,counterparty_account_id,movement_type,amount,balance_delta,description,created_by) values
 (p_date,p_from,p_to,'transfer',p_amount,-p_amount,coalesce(p_description,'Hesaplar arası transfer'),auth.uid()),
 (p_date,p_to,p_from,'transfer',p_amount,p_amount,coalesce(p_description,'Hesaplar arası transfer'),auth.uid());
end;$$;
grant execute on function transfer_finance_balance(uuid,uuid,numeric,text,date) to authenticated;

create or replace function move_finance_cash(p_account_id uuid,p_type finance_cash_movement_type,p_amount numeric,p_description text default null,p_date date default current_date)
returns void language plpgsql security invoker set search_path=public as $$
declare current_balance numeric;
begin
 if p_type not in ('income','expense') or p_amount<=0 then raise exception 'Geçersiz kasa hareketi';end if;
 select balance into current_balance from finance_accounts where id=p_account_id and created_by=auth.uid() for update;
 if not found then raise exception 'Hesap bulunamadı';end if;if p_type='expense' and current_balance<p_amount then raise exception 'Yetersiz bakiye';end if;
 update finance_accounts set balance=balance+case when p_type='income' then p_amount else -p_amount end where id=p_account_id;
 insert into finance_cash_movements(movement_date,account_id,movement_type,amount,balance_delta,description,created_by) values(p_date,p_account_id,p_type,p_amount,case when p_type='income' then p_amount else -p_amount end,p_description,auth.uid());
end;$$;
grant execute on function move_finance_cash(uuid,finance_cash_movement_type,numeric,text,date) to authenticated;
