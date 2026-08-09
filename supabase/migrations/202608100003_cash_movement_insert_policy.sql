-- Kasa fonksiyonları security invoker olarak çalışır; hareket kaydı için kullanıcıya ait INSERT izni gerekir.
drop policy if exists "own cash movement inserts" on finance_cash_movements;
create policy "own cash movement inserts"
on finance_cash_movements for insert to authenticated
with check(created_by=auth.uid());
