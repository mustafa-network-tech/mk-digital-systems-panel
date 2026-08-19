-- Önceki aylık-toplam seçimini genel-toplam seçimine dönüştürür.
alter table finance_installments
  rename column include_in_monthly_total to include_in_grand_total;
