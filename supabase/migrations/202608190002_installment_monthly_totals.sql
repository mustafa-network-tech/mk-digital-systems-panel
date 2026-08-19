-- Bir taksidin aylık ödeme planı toplamlarına dahil edilip edilmeyeceğini belirler.
alter table finance_installments
  add column if not exists include_in_monthly_total boolean not null default true;
