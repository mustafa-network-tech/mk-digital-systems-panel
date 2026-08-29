type CustomerOption={id:string;name:string};
type ProjectValues=Record<string,string|boolean|null|undefined>;

export function ProjectFormFields({customers,project={}}:{customers:CustomerOption[];project?:ProjectValues}){
  return <>
    <Section title="Temel Bilgiler">
      <Field name="name" label="Proje adı" required defaultValue={project.name as string}/><Field name="short_name" label="Kısa ad / kod" defaultValue={project.short_name as string}/>
      <label className="text-sm">Proje grubu<select name="project_group" defaultValue={(project.project_group as string)||"portfolio"} className="field mt-2"><option value="customer_project">Müşteri Projesi</option><option value="portfolio">Portföy</option></select></label>
      <label className="text-sm">Kategori<select name="category" defaultValue={(project.category as string)||""} className="field mt-2"><option value="">Seçilmedi</option><option value="panel">Panel</option><option value="application">Uygulama</option><option value="website">Web Sitesi</option><option value="game">Oyun</option></select></label>
      <label className="text-sm">Müşteri<select name="customer_id" defaultValue={(project.customer_id as string)||""} className="field mt-2"><option value="">Müşteri seçilmedi</option>{customers.map(customer=><option value={customer.id} key={customer.id}>{customer.name}</option>)}</select></label>
      <Select name="status" label="Proje durumu" value={(project.status as string)||"fikir"} options={[["fikir","Fikir"],["gelistiriliyor","Geliştiriliyor"],["test","Test"],["aktif","Aktif"],["bakim","Bakım"],["beklemede","Beklemede"],["tamamlandi","Tamamlandı"],["arsiv","Arşiv"]]}/>
      <label className="text-sm md:col-span-2">Kısa açıklama <span className="muted">(liste görünümünde proje adının altında gösterilir)</span><textarea name="short_description" maxLength={240} defaultValue={(project.short_description as string)||""} className="field mt-2" rows={2}/></label>
      <label className="text-sm md:col-span-2">Ayrıntılı açıklama<textarea name="detailed_description" maxLength={10000} defaultValue={(project.detailed_description as string)||(project.description as string)||""} className="field mt-2" rows={5}/></label>
      {project.id&&<Select name="health_status" label="Sağlık durumu" value={(project.health_status as string)||"unknown"} options={[["healthy","Sağlıklı"],["warning","Uyarı"],["critical","Kritik"],["unknown","Bilinmiyor"]]}/>} 
    </Section>
    <Section title="Teknolojiler ve Kaynak Kod">
      <label className="text-sm md:col-span-2">Teknolojiler <span className="muted">(virgülle ayırın)</span><input name="technologies" defaultValue={(project.technologies as string)||""} className="field mt-2" placeholder="Next.js, TypeScript, Supabase"/></label>
      <Field name="local_source_path" label="Yerel kaynak kod klasör yolu" defaultValue={project.local_source_path as string}/><Field name="github_repo" label="GitHub depo URL’si" type="url" defaultValue={project.github_repo as string}/>
      <Field name="github_repo_name" label="GitHub depo adı" defaultValue={project.github_repo_name as string}/><Field name="github_default_branch" label="Ana branch" defaultValue={project.github_default_branch as string} placeholder="main"/>
    </Section>
    <Section title="Hosting ve Canlı Yayın">
      <label className="text-sm">Hosting sağlayıcısı<select name="hosting_provider" defaultValue={(project.hosting_provider as string)||"vercel"} className="field mt-2"><option value="vercel">Vercel</option><option value="cloudflare">Cloudflare</option><option value="other">Diğer</option></select></label>
      <Field name="hosting_project_name" label="Hosting proje adı" defaultValue={(project.hosting_project_name||project.vercel_project_name) as string}/><Field name="live_url" label="Canlı yayın URL’si" type="url" defaultValue={project.live_url as string}/>
      <label className="text-sm">Canlı yayın durumu<select name="hosting_status" defaultValue={(project.hosting_status as string)||"unknown"} className="field mt-2"><option value="unknown">Bilinmiyor</option><option value="live">Yayında</option><option value="deploying">Yayınlanıyor</option><option value="paused">Durduruldu</option><option value="error">Hata</option><option value="not_deployed">Yayında Değil</option></select></label>
      <Field name="last_deployment_at" label="Son deployment tarihi" type="datetime-local" defaultValue={toLocalDateTime(project.last_deployment_at as string)}/><Field name="vercel_dashboard_url" label="Hosting panel URL’si" type="url" defaultValue={project.vercel_dashboard_url as string}/>
    </Section>
    <Section title="Veritabanı">
      <label className="text-sm">Veritabanı sağlayıcısı<select name="database_provider" defaultValue={(project.database_provider as string)||"none"} className="field mt-2"><option value="supabase">Supabase</option><option value="cloudflare_d1">Cloudflare D1</option><option value="other">Diğer</option><option value="none">Yok</option></select></label>
      <Field name="database_project_name" label="Veritabanı proje adı" defaultValue={(project.database_project_name||project.supabase_project_name) as string}/><Field name="database_safe_identifier" label="Güvenli proje kimliği" defaultValue={(project.database_safe_identifier||project.supabase_project_ref) as string}/>
      <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 md:col-span-2">Şifre, API anahtarı, service role key veya .env değeri girmeyin. Bu alan yalnızca gizli olmayan proje referansı içindir.</p>
    </Section>
    <Section title="README">
      <Field name="readme_source" label="README kaynak referansı" defaultValue={project.readme_source as string} placeholder="README.md"/>
      <div/>
      <label className="text-sm md:col-span-2">README içeriği <span className="muted">(Markdown)</span><textarea name="readme_content" defaultValue={(project.readme_content as string)||""} className="field mt-2 font-mono text-xs" rows={16} placeholder="# Proje adı&#10;&#10;Projenin amacı..."/></label>
    </Section>
  </>;
}

export function Section({title,children}:{title:string;children:React.ReactNode}){return <section className="card grid gap-5 p-6 md:grid-cols-2"><h2 className="font-bold md:col-span-2">{title}</h2>{children}</section>}
export function Field({name,label,type="text",required,placeholder,defaultValue}:{name:string;label:string;type?:string;required?:boolean;placeholder?:string;defaultValue?:string|null}){return <label className="text-sm">{label}<input name={name} type={type} required={required} placeholder={placeholder} defaultValue={defaultValue||""} className="field mt-2"/></label>}
function Select({name,label,value,options}:{name:string;label:string;value:string;options:string[][]}){return <label className="text-sm">{label}<select name={name} defaultValue={value} className="field mt-2">{options.map(([optionValue,optionLabel])=><option value={optionValue} key={optionValue}>{optionLabel}</option>)}</select></label>}
function toLocalDateTime(value?:string){return value?new Date(value).toISOString().slice(0,16):""}
