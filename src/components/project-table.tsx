"use client";

import {ChevronRight,Search,X} from "lucide-react";
import {useRouter} from "next/navigation";
import {useMemo,useState} from "react";
import type {Project,ProjectCategory,ProjectGroup} from "@/lib/types";
import {Status} from "./status";

const groupLabels:Record<ProjectGroup,string>={customer_project:"Müşteri Projesi",portfolio:"Portföy"};
const categoryLabels:Record<ProjectCategory,string>={panel:"Panel",application:"Uygulama",website:"Web Sitesi",game:"Oyun"};
const liveLabels:Record<string,string>={live:"Yayında",deploying:"Yayınlanıyor",paused:"Durduruldu",error:"Hata",not_deployed:"Yayında Değil",unknown:"Bilinmiyor",ready:"Yayında",active:"Yayında"};

export function ProjectTable({projects,emptyText="Henüz proje bulunmuyor."}:{projects:Project[];emptyText?:string}){
  const router=useRouter(),[q,setQ]=useState(""),[group,setGroup]=useState("all"),[category,setCategory]=useState("all"),[status,setStatus]=useState("all");
  const items=useMemo(()=>projects.filter(project=>{
    const technologies=project.project_technologies?.map(item=>item.technologies?.name||"").join(" ")||"";
    const haystack=`${project.name} ${project.short_description||""} ${project.customers?.name||""} ${technologies}`.toLocaleLowerCase("tr");
    return (!q||haystack.includes(q.toLocaleLowerCase("tr")))&&(group==="all"||project.project_group===group)&&(category==="all"||project.category===category)&&(status==="all"||project.status===status);
  }),[projects,q,group,category,status]);
  const filtered=q||group!=="all"||category!=="all"||status!=="all",open=(id:string)=>router.push(`/projects/${id}`);
  return <div className="card overflow-hidden">
    <div className="grid gap-3 border-b p-4 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_190px_190px_190px_auto]">
      <label className="flex min-h-11 items-center gap-2 rounded-lg border px-3 md:col-span-2 xl:col-span-1"><Search size={17}/><input value={q} onChange={event=>setQ(event.target.value)} placeholder="Proje, açıklama, müşteri veya teknoloji ara..." className="w-full bg-transparent py-2 outline-none"/></label>
      <Filter value={group} onChange={setGroup} label="Grup"><option value="all">Tüm gruplar</option><option value="customer_project">Müşteri Projeleri</option><option value="portfolio">Portföy</option></Filter>
      <Filter value={category} onChange={setCategory} label="Kategori"><option value="all">Tüm kategoriler</option><option value="panel">Paneller</option><option value="application">Uygulamalar</option><option value="website">Web Siteleri</option><option value="game">Oyunlar</option></Filter>
      <Filter value={status} onChange={setStatus} label="Durum"><option value="all">Tüm durumlar</option><option value="fikir">Fikir</option><option value="gelistiriliyor">Geliştiriliyor</option><option value="test">Test</option><option value="aktif">Aktif</option><option value="bakim">Bakım</option><option value="beklemede">Beklemede</option><option value="tamamlandi">Tamamlandı</option><option value="arsiv">Arşiv</option></Filter>
      <button type="button" disabled={!filtered} onClick={()=>{setQ("");setGroup("all");setCategory("all");setStatus("all")}} className="btn justify-center disabled:cursor-not-allowed disabled:opacity-40"><X size={16}/>Temizle</button>
    </div>
    <div className="hidden grid-cols-[minmax(260px,1.6fr)_minmax(150px,.8fr)_minmax(130px,.7fr)_minmax(130px,.7fr)_minmax(140px,.7fr)_42px] gap-4 border-b bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid"><span>Proje</span><span>Proje grubu</span><span>Kategori</span><span>Durum</span><span>Canlı yayın</span><span/></div>
    <div className="divide-y">
      {items.map(project=><article key={project.id} role="link" tabIndex={0} onClick={()=>open(project.id)} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();open(project.id)}}} className="group cursor-pointer px-5 py-4 outline-none transition hover:bg-blue-50/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 md:grid md:grid-cols-[minmax(260px,1.6fr)_minmax(150px,.8fr)_minmax(130px,.7fr)_minmax(130px,.7fr)_minmax(140px,.7fr)_42px] md:items-center md:gap-4">
        <div className="min-w-0"><div className="truncate font-semibold group-hover:text-blue-700">{project.name}</div>{project.short_description&&<div className="mt-1 line-clamp-2 text-xs text-slate-500">({project.short_description})</div>}</div>
        <MobileField label="Proje grubu"><span>{project.project_group?groupLabels[project.project_group]:"—"}</span></MobileField><MobileField label="Kategori"><span>{project.category?categoryLabels[project.category]:"—"}</span></MobileField><MobileField label="Durum"><Status value={project.status}/></MobileField><MobileField label="Canlı yayın"><LiveStatus value={project.hosting_status} hasUrl={Boolean(project.live_url)}/></MobileField><ChevronRight className="mt-3 ml-auto text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600 md:mt-0" size={20}/>
      </article>)}
      {!items.length&&<div className="p-12 text-center text-sm text-slate-500">{filtered?"Filtrelerle eşleşen proje bulunamadı.":emptyText}</div>}
    </div>
  </div>;
}
function Filter({value,onChange,label,children}:{value:string;onChange:(value:string)=>void;label:string;children:React.ReactNode}){return <label><span className="sr-only">{label}</span><select className="field min-h-11" value={value} onChange={event=>onChange(event.target.value)}>{children}</select></label>}
function MobileField({label,children}:{label:string;children:React.ReactNode}){return <div className="mt-3 flex items-center justify-between gap-3 text-sm md:mt-0 md:block"><span className="text-xs font-medium text-slate-500 md:hidden">{label}</span>{children}</div>}
function LiveStatus({value,hasUrl}:{value:string|null;hasUrl:boolean}){const normalized=value||(!hasUrl?"not_deployed":"unknown"),tone=["live","ready","active"].includes(normalized)?"bg-emerald-50 text-emerald-700":normalized==="error"?"bg-red-50 text-red-700":"bg-slate-100 text-slate-600";return <span className={`badge ${tone}`}>{liveLabels[normalized]||value||"Bilinmiyor"}</span>}
