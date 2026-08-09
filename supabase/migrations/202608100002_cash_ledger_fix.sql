-- Kasa migration'ının önceki sürümünü çalıştırmış ortamları günceller.
alter table finance_cash_movements
  add column if not exists balance_delta numeric(14,2) not null default 0;

update finance_cash_movements set balance_delta=amount
where movement_type='income' and balance_delta=0;
update finance_cash_movements set balance_delta=-amount
where movement_type='expense' and balance_delta=0;
update finance_cash_movements set balance_delta=amount
where movement_type='adjustment' and balance_delta=0 and description like '%(+)';
update finance_cash_movements set balance_delta=-amount
where movement_type='adjustment' and balance_delta=0 and description like '%(-)';

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

create or replace function transfer_finance_balance(p_from uuid,p_to uuid,p_amount numeric,p_description text default null,p_date date default current_date)
returns void language plpgsql security invoker set search_path=public as $$
declare from_balance numeric;
begin
 if p_from=p_to or p_amount<=0 then raise exception 'Geçersiz transfer';end if;
 select balance into from_balance from finance_accounts where id=p_from and created_by=auth.uid() for update;
 if not found then raise exception 'Kaynak hesap bulunamadı';end if;
 if from_balance<p_amount then raise exception 'Yetersiz bakiye';end if;
 perform 1 from finance_accounts where id=p_to and created_by=auth.uid() for update;
 if not found then raise exception 'Hedef hesap bulunamadı';end if;
 update finance_accounts set balance=balance-p_amount where id=p_from;
 update finance_accounts set balance=balance+p_amount where id=p_to;
 insert into finance_cash_movements(movement_date,account_id,counterparty_account_id,movement_type,amount,balance_delta,description,created_by) values
 (p_date,p_from,p_to,'transfer',p_amount,-p_amount,coalesce(p_description,'Hesaplar arası transfer'),auth.uid()),
 (p_date,p_to,p_from,'transfer',p_amount,p_amount,coalesce(p_description,'Hesaplar arası transfer'),auth.uid());
end;$$;

create or replace function move_finance_cash(p_account_id uuid,p_type finance_cash_movement_type,p_amount numeric,p_description text default null,p_date date default current_date)
returns void language plpgsql security invoker set search_path=public as $$
declare current_balance numeric;
begin
 if p_type not in ('income','expense') or p_amount<=0 then raise exception 'Geçersiz kasa hareketi';end if;
 select balance into current_balance from finance_accounts where id=p_account_id and created_by=auth.uid() for update;
 if not found then raise exception 'Hesap bulunamadı';end if;
 if p_type='expense' and current_balance<p_amount then raise exception 'Yetersiz bakiye';end if;
 update finance_accounts set balance=balance+case when p_type='income' then p_amount else -p_amount end where id=p_account_id;
 insert into finance_cash_movements(movement_date,account_id,movement_type,amount,balance_delta,description,created_by)
 values(p_date,p_account_id,p_type,p_amount,case when p_type='income' then p_amount else -p_amount end,p_description,auth.uid());
end;$$;

grant execute on function adjust_finance_balance(uuid,numeric,text,date) to authenticated;
grant execute on function transfer_finance_balance(uuid,uuid,numeric,text,date) to authenticated;
grant execute on function move_finance_cash(uuid,finance_cash_movement_type,numeric,text,date) to authenticated;
