"use client";

import {ChevronRight,Database,Search,Server,X} from "lucide-react";
import {useRouter} from "next/navigation";
import {useMemo,useState} from "react";
import type {Project,ProjectCategory,ProjectGroup} from "@/lib/types";
import {Status} from "./status";

const categories:{value:ProjectCategory;label:string}[]=[{value:"panel",label:"Paneller"},{value:"application",label:"Uygulamalar"},{value:"website",label:"Web Siteleri"},{value:"game",label:"Oyunlar"}];
const hostingLabels:Record<string,string>={vercel:"Vercel",cloudflare:"Cloudflare",other:"Diğer"};
const databaseLabels:Record<string,string>={supabase:"Supabase",cloudflare_d1:"Cloudflare D1",other:"Diğer",none:""};

export function ProjectTable({projects,emptyText="Henüz proje bulunmuyor."}:{projects:Project[];emptyText?:string}){
  const router=useRouter(),[q,setQ]=useState(""),[group,setGroup]=useState<ProjectGroup>("portfolio"),[category,setCategory]=useState<ProjectCategory|"all">("all"),[status,setStatus]=useState("all");
  const groupOf=(project:Project):ProjectGroup=>project.project_group||(project.customer_id?"customer_project":"portfolio");
  const counts={portfolio:projects.filter(project=>groupOf(project)==="portfolio").length,customer_project:projects.filter(project=>groupOf(project)==="customer_project").length};
  const items=useMemo(()=>projects.filter(project=>{
    const technologies=project.project_technologies?.map(item=>item.technologies?.name||"").join(" ")||"",haystack=`${project.name} ${project.short_description||""} ${project.customers?.name||""} ${technologies}`.toLocaleLowerCase("tr");
    return groupOf(project)===group&&(!q||haystack.includes(q.toLocaleLowerCase("tr")))&&(category==="all"||project.category===category)&&(status==="all"||project.status===status);
  }),[projects,q,group,category,status]);
  const sections=[...categories.map(item=>({...item,projects:items.filter(project=>project.category===item.value)})),{value:"uncategorized",label:"Sınıflandırılmamış",projects:items.filter(project=>!project.category)}].filter(section=>section.projects.length);
  const filtered=Boolean(q)||category!=="all"||status!=="all",open=(id:string)=>router.push(`/projects/${id}`);
  return <div className="space-y-4">
    <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-200/70 p-1 sm:w-fit">
      <Tab active={group==="portfolio"} onClick={()=>setGroup("portfolio")} label="Kişisel Projeler" count={counts.portfolio}/><Tab active={group==="customer_project"} onClick={()=>setGroup("customer_project")} label="Müşteri Projeleri" count={counts.customer_project}/>
    </div>
    <div className="panel-surface flex flex-col gap-2 p-2.5 lg:flex-row lg:items-center">
      <label className="flex min-h-10 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3"><Search size={16} className="text-slate-400"/><input value={q} onChange={event=>setQ(event.target.value)} placeholder="Projelerde ara..." className="w-full bg-transparent py-2 text-sm outline-none"/></label>
      <div className="grid grid-cols-2 gap-2 sm:flex"><Filter value={category} onChange={value=>setCategory(value as ProjectCategory|"all")} label="Kategori"><option value="all">Tüm kategoriler</option>{categories.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</Filter><Filter value={status} onChange={setStatus} label="Durum"><option value="all">Tüm durumlar</option><option value="fikir">Fikir</option><option value="gelistiriliyor">Geliştiriliyor</option><option value="test">Test</option><option value="aktif">Aktif</option><option value="bakim">Bakım</option><option value="beklemede">Beklemede</option><option value="tamamlandi">Tamamlandı</option><option value="arsiv">Arşiv</option></Filter></div>
      <button type="button" disabled={!filtered} onClick={()=>{setQ("");setCategory("all");setStatus("all")}} className="btn min-h-10 justify-center px-3 disabled:cursor-not-allowed disabled:opacity-35"><X size={15}/><span className="lg:hidden xl:inline">Temizle</span></button>
    </div>
    {sections.length?<div className="space-y-4">{sections.map(section=><section key={section.value} className="panel-surface overflow-hidden"><div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-2.5"><h2 className="text-xs font-bold uppercase tracking-[.14em] text-slate-700">{section.label}</h2><span className="text-xs font-semibold text-slate-400">{section.projects.length}</span></div><div className="divide-y divide-slate-100">{section.projects.map(project=><article key={project.id} role="link" tabIndex={0} onClick={()=>open(project.id)} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();open(project.id)}}} className="group cursor-pointer px-4 py-3 outline-none transition hover:bg-blue-50/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 sm:flex sm:items-center sm:justify-between sm:gap-5">
          <div className="min-w-0"><div className="truncate text-sm font-bold text-slate-900 group-hover:text-blue-700">{project.name}</div>{project.short_description&&<div className="mt-0.5 line-clamp-1 text-xs text-slate-500">({project.short_description})</div>}{project.customers?.name&&<div className="mt-1 text-[11px] font-medium text-slate-400">{project.customers.name}</div>}</div>
          <div className="mt-2 flex shrink-0 items-center justify-end gap-2 sm:mt-0"><Status value={project.status}/><ServiceSummary project={project}/><ChevronRight size={18} className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600"/></div>
        </article>)}</div></section>)}</div>:<div className="panel-surface p-10 text-center text-sm text-slate-500">{filtered?"Filtrelerle eşleşen proje bulunamadı.":emptyText}</div>}
  </div>;
}

function Tab({active,onClick,label,count}:{active:boolean;onClick:()=>void;label:string;count:number}){return <button type="button" onClick={onClick} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition sm:flex-none ${active?"bg-[#0b1630] text-white shadow-sm":"text-slate-600 hover:bg-white/70"}`}>{label}<span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active?"bg-blue-500 text-white":"bg-slate-300/70 text-slate-600"}`}>{count}</span></button>}
function Filter({value,onChange,label,children}:{value:string;onChange:(value:string)=>void;label:string;children:React.ReactNode}){return <label><span className="sr-only">{label}</span><select className="field min-h-10 py-2 text-sm sm:w-44" value={value} onChange={event=>onChange(event.target.value)}>{children}</select></label>}
function ServiceSummary({project}:{project:Project}){const hosting=project.hosting_provider?hostingLabels[project.hosting_provider]:"",database=project.database_provider?databaseLabels[project.database_provider]:"";if(!hosting&&!database)return null;return <span className="hidden items-center gap-1.5 text-xs font-semibold text-slate-500 md:inline-flex">{hosting&&<><Server size={13}/>{hosting}</>}{hosting&&database&&<span className="text-slate-300">·</span>}{database&&<><Database size={13}/>{database}</>}</span>}
