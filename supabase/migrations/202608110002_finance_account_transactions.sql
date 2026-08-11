-- Gelir/gider ile kasa hareketlerini tek ve atomik işlemde bağlar.
-- Eski kayıtlar korunur; account_id alanları geçmiş veriler için nullable kalır.
alter table finance_accounts add column if not exists opening_balance numeric(14,2) not null default 0;
alter table finance_income add column if not exists account_id uuid references finance_accounts on delete restrict;
alter table finance_expenses add column if not exists account_id uuid references finance_accounts on delete restrict;
alter table finance_cash_movements add column if not exists source_type text;
alter table finance_cash_movements add column if not exists source_id uuid;

create index if not exists finance_income_account_idx on finance_income(account_id);
create index if not exists finance_expenses_account_idx on finance_expenses(account_id);
create unique index if not exists finance_cash_source_unique
  on finance_cash_movements(created_by,source_type,source_id)
  where source_type in ('income','expense');

create or replace function save_finance_income(
  p_id uuid,p_amount numeric,p_date date,p_category_id uuid,p_source text,p_description text,p_recurring boolean,p_account_id uuid
) returns uuid language plpgsql security invoker set search_path=public as $$
declare v_id uuid;v_old finance_income%rowtype;v_account finance_accounts%rowtype;
begin
 if p_amount<=0 then raise exception 'Geçersiz tutar';end if;
 select * into v_account from finance_accounts where id=p_account_id and created_by=auth.uid() and is_active for update;
 if not found then raise exception 'Hesap bulunamadı';end if;
 if p_id is null then
  insert into finance_income(amount,income_date,category_id,source,description,recurring,account_id,created_by)
  values(p_amount,p_date,p_category_id,p_source,p_description,p_recurring,p_account_id,auth.uid()) returning id into v_id;
 else
  select * into v_old from finance_income where id=p_id and created_by=auth.uid() for update;
  if not found then raise exception 'Gelir kaydı bulunamadı';end if;
  if v_old.account_id is not null then update finance_accounts set balance=balance-v_old.amount where id=v_old.account_id;end if;
  delete from finance_cash_movements where source_type='income' and source_id=p_id and created_by=auth.uid();
  update finance_income set amount=p_amount,income_date=p_date,category_id=p_category_id,source=p_source,description=p_description,recurring=p_recurring,account_id=p_account_id where id=p_id;
  v_id:=p_id;
 end if;
 update finance_accounts set balance=balance+p_amount where id=p_account_id;
 insert into finance_cash_movements(movement_date,account_id,movement_type,amount,balance_delta,description,source_type,source_id,created_by)
 values(p_date,p_account_id,'income',p_amount,p_amount,coalesce(nullif(p_description,''),'Gelir'), 'income',v_id,auth.uid());
 return v_id;
end;$$;

create or replace function save_finance_expense(
  p_id uuid,p_amount numeric,p_date date,p_category_id uuid,p_payment_method text,p_description text,p_recurring boolean,p_account_id uuid
) returns uuid language plpgsql security invoker set search_path=public as $$
declare v_id uuid;v_old finance_expenses%rowtype;
begin
 if p_amount<=0 then raise exception 'Geçersiz tutar';end if;
 if p_id is not null then
  select * into v_old from finance_expenses where id=p_id and created_by=auth.uid() for update;
  if not found then raise exception 'Gider kaydı bulunamadı';end if;
  if v_old.account_id is not null then update finance_accounts set balance=balance+v_old.amount where id=v_old.account_id;end if;
  delete from finance_cash_movements where source_type='expense' and source_id=p_id and created_by=auth.uid();
 end if;
 perform 1 from finance_accounts where id=p_account_id and created_by=auth.uid() and is_active for update;
 if not found then raise exception 'Hesap bulunamadı';end if;
 if p_id is null then
  insert into finance_expenses(amount,expense_date,category_id,payment_method,description,recurring,account_id,created_by)
  values(p_amount,p_date,p_category_id,p_payment_method,p_description,p_recurring,p_account_id,auth.uid()) returning id into v_id;
 else
  update finance_expenses set amount=p_amount,expense_date=p_date,category_id=p_category_id,payment_method=p_payment_method,description=p_description,recurring=p_recurring,account_id=p_account_id where id=p_id;v_id:=p_id;
 end if;
 update finance_accounts set balance=balance-p_amount where id=p_account_id;
 insert into finance_cash_movements(movement_date,account_id,movement_type,amount,balance_delta,description,source_type,source_id,created_by)
 values(p_date,p_account_id,'expense',p_amount,-p_amount,coalesce(nullif(p_description,''),'Gider'),'expense',v_id,auth.uid());
 return v_id;
end;$$;

create or replace function delete_finance_transaction(p_table text,p_id uuid)
returns void language plpgsql security invoker set search_path=public as $$
declare v_account uuid;v_amount numeric;
begin
 if p_table='finance_income' then
  select account_id,amount into v_account,v_amount from finance_income where id=p_id and created_by=auth.uid() for update;
  if not found then raise exception 'Gelir kaydı bulunamadı';end if;
  if v_account is not null then update finance_accounts set balance=balance-v_amount where id=v_account;end if;
  delete from finance_cash_movements where source_type='income' and source_id=p_id and created_by=auth.uid();
  delete from finance_income where id=p_id and created_by=auth.uid();
 elsif p_table='finance_expenses' then
  select account_id,amount into v_account,v_amount from finance_expenses where id=p_id and created_by=auth.uid() for update;
  if not found then raise exception 'Gider kaydı bulunamadı';end if;
  if v_account is not null then update finance_accounts set balance=balance+v_amount where id=v_account;end if;
  delete from finance_cash_movements where source_type='expense' and source_id=p_id and created_by=auth.uid();
  delete from finance_expenses where id=p_id and created_by=auth.uid();
 else raise exception 'Geçersiz tablo';
 end if;
end;$$;

grant execute on function save_finance_income(uuid,numeric,date,uuid,text,text,boolean,uuid) to authenticated;
grant execute on function save_finance_expense(uuid,numeric,date,uuid,text,text,boolean,uuid) to authenticated;
grant execute on function delete_finance_transaction(text,uuid) to authenticated;
