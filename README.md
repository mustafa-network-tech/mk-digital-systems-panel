# MK Digital Vault

MK Digital Systems projelerinin kod, deployment, domain, belge, yedek ve recovery bilgisini tek yerde yöneten Next.js + Supabase uygulaması.

## Kurulum

1. `.env.example` dosyasını `.env.local` olarak kopyalayın ve Supabase public değerlerini girin.
2. `supabase/migrations/202608090001_initial_schema.sql` migration dosyasını Supabase projenizde çalıştırın.
   Ardından `supabase/migrations/202608090002_personal_finance.sql` dosyasını çalıştırın.
3. `npm install` ardından `npm run dev` çalıştırın.

Bucket migration tarafından private ve 100 MB limitli oluşturulur. Secret değerleri veritabanına kaydedilmez; recovery ekranı yalnızca environment değişkenlerinin adını ve yapılandırma durumunu tutar.

Dashboard, proje modülleri ve kişisel finans ekranları yalnızca oturum sahibinin Supabase kayıtlarını kullanır. Finans migration'ındaki `pay_finance_installment` fonksiyonu ödeme ve gider oluşturma işlemini tek transaction içinde gerçekleştirir.
