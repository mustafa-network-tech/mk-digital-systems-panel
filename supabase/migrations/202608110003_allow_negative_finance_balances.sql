-- Kişisel hesaplar gider ve manuel para çıkışlarında negatif bakiyeye düşebilir.
create or replace function move_finance_cash(p_account_id uuid,p_type finance_cash_movement_type,p_amount numeric,p_description text default null,p_date date default current_date)
returns void language plpgsql security invoker set search_path=public as $$
begin
 if p_type not in ('income','expense') or p_amount<=0 then raise exception 'Geçersiz kasa hareketi';end if;
 perform 1 from finance_accounts where id=p_account_id and created_by=auth.uid() for update;
 if not found then raise exception 'Hesap bulunamadı';end if;
 update finance_accounts set balance=balance+case when p_type='income' then p_amount else -p_amount end where id=p_account_id;
 insert into finance_cash_movements(movement_date,account_id,movement_type,amount,balance_delta,description,created_by)
 values(p_date,p_account_id,p_type,p_amount,case when p_type='income' then p_amount else -p_amount end,p_description,auth.uid());
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

grant execute on function move_finance_cash(uuid,finance_cash_movement_type,numeric,text,date) to authenticated;
grant execute on function save_finance_expense(uuid,numeric,date,uuid,text,text,boolean,uuid) to authenticated;
