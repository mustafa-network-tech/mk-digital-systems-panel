-- Taksitler yalnızca bilgi amaçlıdır. Hesaplar kredi kartı kullanılabilir limitini de izler.
alter table finance_accounts
  add column if not exists account_type text not null default 'bank'
  check (account_type in ('cash','bank','credit_card'));

update finance_accounts set account_type='cash' where name='Nakit';

create table if not exists finance_installment_payments(
  id uuid primary key default gen_random_uuid(),
  installment_id uuid not null references finance_installments on delete cascade,
  installment_sequence integer not null check(installment_sequence>0),
  amount numeric(14,2) not null check(amount>0),
  payment_date date not null default current_date,
  created_by uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  unique(installment_id,installment_sequence)
);
create index if not exists finance_installment_payments_user_date_idx on finance_installment_payments(created_by,payment_date desc);
alter table finance_installment_payments enable row level security;
create policy "own installment payments" on finance_installment_payments for all to authenticated
  using(created_by=auth.uid()) with check(created_by=auth.uid());

-- Önceki sürümün taksit giderlerini ödeme geçmişine taşı, kasa etkisini geri al ve giderden çıkar.
insert into finance_installment_payments(installment_id,installment_sequence,amount,payment_date,created_by)
select installment_id,installment_sequence,amount,expense_date,created_by
from finance_expenses
where installment_id is not null and installment_sequence is not null
on conflict(installment_id,installment_sequence) do nothing;

update finance_accounts a set balance=a.balance+e.total
from (
  select account_id,sum(amount) total from finance_expenses
  where installment_id is not null and account_id is not null group by account_id
) e where a.id=e.account_id;

delete from finance_cash_movements m using finance_expenses e
where e.installment_id is not null and m.source_type='expense' and m.source_id=e.id;
delete from finance_expenses where installment_id is not null;

create or replace function ensure_finance_defaults() returns void language plpgsql security invoker set search_path=public as $$
declare n text;
begin
 foreach n in array array['Kredi Kartı 1','Kredi Kartı 2','Cep Telefonu 1','Cep Telefonu 2','İnternet 1','İnternet 2','Kişisel Harcama','Yazılım Harcaması','Market','Ulaşım','Konaklama','Diğer','Taksit'] loop
  insert into finance_categories(name,type,created_by) values(n,'expense',auth.uid()) on conflict(created_by,name,type) do nothing;
 end loop;
 foreach n in array array['Telekom','Yazılım'] loop
  insert into finance_categories(name,type,created_by) values(n,'income',auth.uid()) on conflict(created_by,name,type) do nothing;
 end loop;
 insert into finance_accounts(name,account_type,created_by) values('Garanti','bank',auth.uid()) on conflict(created_by,name) do nothing;
 insert into finance_accounts(name,account_type,created_by) values('DenizBank','bank',auth.uid()) on conflict(created_by,name) do nothing;
 insert into finance_accounts(name,account_type,created_by) values('Nakit','cash',auth.uid()) on conflict(created_by,name) do nothing;
 insert into finance_accounts(name,account_type,created_by) values('Kredi Kartı','credit_card',auth.uid()) on conflict(created_by,name) do nothing;
end;$$;

create or replace function pay_finance_installment(p_installment_id uuid,p_payment_date date default current_date)
returns void language plpgsql security invoker set search_path=public as $$
declare v finance_installments%rowtype;v_sequence integer;
begin
 select * into v from finance_installments where id=p_installment_id and created_by=auth.uid() for update;
 if not found then raise exception 'Taksit bulunamadı';end if;
 if v.status='completed' or v.paid_installment_count>=v.installment_count then raise exception 'Taksit tamamlanmış';end if;
 v_sequence:=v.paid_installment_count+1;
 insert into finance_installment_payments(installment_id,installment_sequence,amount,payment_date,created_by)
 values(v.id,v_sequence,v.installment_amount,p_payment_date,auth.uid());
 update finance_installments set paid_installment_count=v_sequence,
   status=case when v_sequence>=installment_count then 'completed'::installment_status else 'active'::installment_status end,
   next_payment_date=case when v_sequence>=installment_count then null else (next_payment_date+interval '1 month')::date end
 where id=p_installment_id;
end;$$;

grant execute on function ensure_finance_defaults() to authenticated;
grant execute on function pay_finance_installment(uuid,date) to authenticated;
