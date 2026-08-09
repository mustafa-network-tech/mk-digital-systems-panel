import { redirect } from "next/navigation";
import { Header } from "@/components/sidebar";
import { updateProfile } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) redirect("/login");

  const fullName = typeof user.user_metadata.full_name === "string"
    ? user.user_metadata.full_name
    : typeof user.user_metadata.name === "string"
      ? user.user_metadata.name
      : "";

  return <>
    <Header title="Ayarlar" description="Vault ve hesap tercihlerini yönetin."/>
    <div className="max-w-3xl space-y-5 p-5 lg:p-8">
      <section className="card p-6">
        <h2 className="font-bold">Profil</h2>
        <p className="mt-1 text-sm muted">Bilgiler giriş yaptığınız Supabase Auth hesabından alınır.</p>
        <form action={updateProfile}>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm">Ad soyad
              <input required minLength={2} maxLength={100} name="full_name" className="field mt-2" defaultValue={fullName} placeholder="Adınız ve soyadınız"/>
            </label>
            <label className="text-sm">E-posta
              <input type="email" className="field mt-2 bg-slate-50" value={user.email ?? ""} readOnly aria-readonly="true"/>
            </label>
          </div>
          <button className="btn btn-primary mt-5">Değişiklikleri kaydet</button>
        </form>
      </section>
      <section className="card p-6">
        <h2 className="font-bold">Storage güvenliği</h2>
        <p className="mt-2 text-sm muted">project-files bucket private olarak yapılandırılmıştır. Dosyalara yalnızca doğrulanmış oturumlar erişebilir.</p>
        <span className="badge mt-4 bg-green-50 text-green-700">RLS aktif</span>
      </section>
    </div>
  </>;
}
