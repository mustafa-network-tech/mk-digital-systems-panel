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
  const avatarUrl = typeof user.user_metadata.avatar_url === "string"
    ? user.user_metadata.avatar_url
    : typeof user.user_metadata.picture === "string"
      ? user.user_metadata.picture
      : "";

  return <>
    <Header title="Ayarlar" description="Vault ve hesap tercihlerini yönetin."/>
    <div className="max-w-3xl space-y-5 p-5 lg:p-8">
      <section className="card p-6">
        <h2 className="font-bold">Profil</h2>
        <p className="mt-1 text-sm muted">Bilgiler giriş yaptığınız Supabase Auth hesabından alınır.</p>
        <form action={updateProfile}>
          <div className="mt-5 flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-[#0b1630] bg-cover bg-center text-sm font-black text-white ring-2 ring-slate-200" style={avatarUrl?{backgroundImage:`url(${JSON.stringify(avatarUrl).slice(1,-1)})`}:undefined}>{avatarUrl?<span className="sr-only">Profil fotoğrafı</span>:(fullName.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join("").toLocaleUpperCase("tr-TR")||"MK")}</div>
            <div><h3 className="text-sm font-bold text-slate-900">Profil fotoğrafı</h3><p className="mt-1 text-xs muted">Fotoğraf eklenmemişse baş harfleriniz gösterilir.</p></div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm">Ad soyad
              <input required minLength={2} maxLength={100} name="full_name" className="field mt-2" defaultValue={fullName} placeholder="Adınız ve soyadınız"/>
            </label>
            <label className="text-sm">E-posta
              <input type="email" className="field mt-2 bg-slate-50" value={user.email ?? ""} readOnly aria-readonly="true"/>
            </label>
            <label className="text-sm md:col-span-2">Profil fotoğrafı URL’si
              <input type="url" maxLength={2000} name="avatar_url" className="field mt-2" defaultValue={avatarUrl} placeholder="https://.../profil-fotografi.jpg"/>
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
