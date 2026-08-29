import Link from "next/link";
import {notFound} from "next/navigation";
import {Database,ExternalLink,FileArchive,Globe2,NotebookText} from "lucide-react";
import {createDomain} from "@/app/actions";
import {MaskedValue} from "@/components/masked-value";
import {Header} from "@/components/sidebar";
import {SourceUpload} from "@/components/source-upload";
import {Health,Status} from "@/components/status";
import {createClient} from "@/lib/supabase/server";

const groupLabels:Record<string,string>={customer_project:"Müşteri Projesi",portfolio:"Kişisel Proje"};
const categoryLabels:Record<string,string>={panel:"Panel",application:"Uygulama",website:"Web Sitesi",game:"Oyun"};
const providerLabels:Record<string,string>={vercel:"Vercel",cloudflare:"Cloudflare",other:"Diğer",supabase:"Supabase",cloudflare_d1:"Cloudflare D1",none:"Yok"};
const hostingLabels:Record<string,string>={live:"Yayında",deploying:"Yayınlanıyor",paused:"Durduruldu",error:"Hata",not_deployed:"Yayında Değil",unknown:"Bilinmiyor",ready:"Yayında",active:"Yayında"};

export default async function Page({params}:{params:Promise<{id:string}>}){
  const {id}=await params,s=await createClient();
  const [{data:p,error},{data:source},{data:databaseBackups},{data:domains},{data:technologyLinks},{data:notes}]=await Promise.all([
    s.from("projects").select("*,customers(name)").eq("id",id).single(),s.from("source_backups").select("*").eq("project_id",id).order("created_at",{ascending:false}),s.from("database_backups").select("*").eq("project_id",id).order("created_at",{ascending:false}),s.from("domains").select("*").eq("project_id",id).order("expiry_date"),s.from("project_technologies").select("technologies(name)").eq("project_id",id),s.from("project_notes").select("*").eq("project_id",id).order("pinned",{ascending:false}).order("updated_at",{ascending:false})
  ]);
  if(error||!p)notFound();
  const technologies=(technologyLinks||[]).map(link=>{const technology=Array.isArray(link.technologies)?link.technologies[0]:link.technologies;return technology?.name}).filter(Boolean) as string[];
  const latestSource=source?.[0]?.created_at||p.last_backup_at,latestDatabase=databaseBackups?.[0]?.created_at;
  return <><Header title="Proje Detayı" description="Servisler, kaynak kodu, domain ve proje bilgileri."/><div className="space-y-6 p-5 lg:p-8">
    <section className="card p-6"><div className="flex flex-wrap gap-2"><Status value={p.status}/><Health value={p.health_status}/><Badge>{groupLabels[p.project_group]||"Grup seçilmedi"}</Badge><Badge>{categoryLabels[p.category]||"Kategori seçilmedi"}</Badge><Badge>{hostingLabels[p.hosting_status]||"Yayın durumu bilinmiyor"}</Badge></div><h1 className="mt-4 text-2xl font-bold">{p.name}</h1>{p.short_description&&<p className="mt-1 text-sm text-slate-500">({p.short_description})</p>}<p className="mt-4 whitespace-pre-wrap muted">{p.detailed_description||p.description||"Proje açıklaması bulunmuyor."}</p><div className="mt-5 flex flex-wrap gap-2">{p.live_url&&<LinkButton href={p.live_url} icon={ExternalLink} label="Canlı Site"/>}</div></section>
    <div className="grid gap-6 xl:grid-cols-3">
      <Info title="Proje" rows={[["Grup",groupLabels[p.project_group]],["Kategori",categoryLabels[p.category]],["Müşteri",p.customers?.name],["Teknolojiler",technologies.join(", ")]]}/>
      <Info title="GitHub ve Kaynak" rows={[["Repository",p.github_repo_name,true],["Repository URL",p.github_repo,true,true],["Ana branch",p.github_default_branch],["Yerel klasör",p.local_source_path,true]]}/>
      <Info title="Hosting" rows={[["Sağlayıcı",providerLabels[p.hosting_provider]],["Proje",p.hosting_project_name,true],["Panel URL",p.vercel_dashboard_url,true,true],["Durum",hostingLabels[p.hosting_status]],["Son deployment",formatDate(p.last_deployment_at)]]}/>
      <Info title="Veritabanı" rows={[["Sağlayıcı",providerLabels[p.database_provider]],["Proje",p.database_project_name,true],["Güvenli kimlik",p.database_safe_identifier,true]]}/>
      <Info title="Yedek Durumu" rows={[["Son kaynak kod yedeği",formatDate(latestSource)],["Son veritabanı yedeği",formatDate(latestDatabase)]]}/>
      <Info title="Canlı Yayın" rows={[["URL",p.live_url,true,true],["Durum",hostingLabels[p.hosting_status]||"Bilinmiyor"]]}/>
    </div>
    <section className="card"><div className="flex items-center justify-between border-b p-5"><div><h2 className="flex items-center gap-2 font-bold"><FileArchive size={18}/>Kaynak Kod ZIP</h2><p className="mt-1 text-sm muted">Private Storage ve SHA-256 doğrulaması</p></div><SourceUpload projectId={id}/></div>{source?.length?<div className="divide-y">{source.map(item=><div className="p-4" key={item.id}><b className="text-sm">{item.filename}</b><div className="mt-1 text-xs muted">{new Date(item.created_at).toLocaleString("tr-TR")} · {item.file_hash.slice(0,12)}…</div></div>)}</div>:<Empty text="Henüz ZIP yedeği yüklenmemiş."/>}</section>
    <div className="grid gap-6 xl:grid-cols-2"><section className="card"><h2 className="flex items-center gap-2 border-b p-5 font-bold"><Globe2 size={18}/>Domain Bilgileri</h2>{domains?.length?<div className="divide-y">{domains.map(domain=><div className="flex items-center justify-between gap-3 p-4" key={domain.id}><div><b>{domain.domain}</b><div className="text-sm muted">{domain.registrar} · {domain.expiry_date?new Date(`${domain.expiry_date}T12:00:00`).toLocaleDateString("tr-TR"):"—"}</div></div><Link href={`/domains/${domain.id}/edit`} className="btn">Düzenle</Link></div>)}</div>:<Empty text="Henüz domain eklenmemiş."/>}<form action={createDomain} className="grid gap-3 border-t p-5 sm:grid-cols-2"><input type="hidden" name="project_id" value={id}/><input required name="domain" className="field" placeholder="Domain adı"/><input required name="registrar" className="field" placeholder="Nereden alındı?"/><input required name="expiry_date" type="date" className="field"/><label className="flex items-center gap-2 text-sm"><input name="auto_renew" type="checkbox"/>Otomatik yenileme</label><button className="btn btn-primary sm:col-span-2 sm:justify-self-end">Domain ekle</button></form></section>
      <section className="card"><h2 className="flex items-center gap-2 border-b p-5 font-bold"><Database size={18}/>Veritabanı Yedekleri</h2>{databaseBackups?.length?<div className="divide-y">{databaseBackups.map(backup=><div className="p-4" key={backup.id}><b className="text-sm">{backup.filename}</b><div className="mt-1 text-xs muted">{new Date(backup.created_at).toLocaleString("tr-TR")}</div></div>)}</div>:<Empty text="Henüz veritabanı yedeği bulunmuyor."/>}</section></div>
    <section className="card"><div className="border-b p-5"><h2 className="flex items-center gap-2 font-bold"><NotebookText size={18}/>README</h2><p className="mt-1 text-sm muted">{p.readme_source||"README kaynağı belirtilmedi"}{p.readme_synced_at?` · ${new Date(p.readme_synced_at).toLocaleString("tr-TR")}`:""}</p></div>{p.readme_content?<pre className="overflow-x-auto whitespace-pre-wrap break-words p-5 font-sans text-sm leading-7">{p.readme_content}</pre>:<Empty text="README içeriği henüz eklenmemiş."/>}</section>
    <section className="card"><h2 className="border-b p-5 font-bold">Notlar ve Yapılacaklar</h2>{notes?.length?<div className="divide-y">{notes.map(note=><article className="p-5" key={note.id}><div className="flex items-center gap-2"><b>{note.title}</b><span className="badge bg-slate-100 text-slate-600">{note.category}</span></div><p className="mt-2 whitespace-pre-wrap text-sm muted">{note.content}</p></article>)}</div>:<Empty text="Henüz not veya yapılacak kaydı bulunmuyor."/>}</section>
  </div></>;
}

type InfoRow=[string,string|null|undefined,boolean?,boolean?];
function Info({title,rows}:{title:string;rows:InfoRow[]}){return <section className="card"><h2 className="border-b p-4 font-bold">{title}</h2>{rows.map(([label,value,masked,href])=><div className="flex items-center justify-between gap-3 border-b p-4 text-sm last:border-0" key={label}><span className="shrink-0 muted">{label}</span>{masked?<MaskedValue value={value} href={href}/>:<span className="max-w-64 truncate text-right font-medium">{value||"—"}</span>}</div>)}</section>}
function Empty({text}:{text:string}){return <div className="p-8 text-center text-sm muted">{text}</div>}
function LinkButton({href,icon:Icon,label}:{href:string;icon:typeof ExternalLink;label:string}){return <a href={href} target="_blank" rel="noreferrer" className="btn"><Icon size={16}/>{label}</a>}
function Badge({children}:{children:React.ReactNode}){return <span className="badge bg-slate-100 text-slate-700">{children}</span>}
function formatDate(value:string|null|undefined){return value?new Date(value).toLocaleString("tr-TR"):null}
