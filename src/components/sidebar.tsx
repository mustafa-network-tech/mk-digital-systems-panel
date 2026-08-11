"use client";

import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {useEffect,useState} from "react";
import {BriefcaseBusiness,FolderKanban,Globe2,LayoutDashboard,Loader2,LogOut,Menu,Search,Settings,ShieldCheck,Users,WalletCards,X} from "lucide-react";
import {toast} from "sonner";
import {createClient} from "@/lib/supabase/client";

type NavItem={href:string;label:string;icon?:typeof LayoutDashboard;groupStart?:boolean;children?:readonly {href:string;label:string}[]};
const navigation:readonly NavItem[]=[
  {href:"/dashboard",label:"Dashboard",icon:LayoutDashboard},
  {href:"/projects",label:"Projeler",icon:FolderKanban},
  {href:"/customers",label:"Müşteriler",icon:Users},
  {href:"/domains",label:"Domainler",icon:Globe2},
  {href:"/settings",label:"Ayarlar",icon:Settings},
  {href:"/finance",label:"Kişisel Finans",icon:WalletCards,groupStart:true,children:[
      {href:"/finance",label:"Genel Bakış"},{href:"/finance/income",label:"Gelirler"},{href:"/finance/expenses",label:"Giderler"},{href:"/finance/installments",label:"Taksitler"},{href:"/finance/cash",label:"Kasa"},{href:"/finance/history",label:"Geçmiş / İstatistikler"}
  ]},
  {href:"/work-advance",label:"İş Avansı",icon:BriefcaseBusiness}
];

function Navigation({pathname,onNavigate}:{pathname:string;onNavigate?:()=>void}){return <nav className="flex-1 overflow-y-auto p-3">{navigation.map(item=><div key={item.href}>{item.groupStart&&<div className="my-4 border-t border-white/10"/>}<NavLink item={item} pathname={pathname} onNavigate={onNavigate}/>{item.children&&<div className="ml-6 mt-1">{item.children.map(child=><Link onClick={onNavigate} key={child.href} href={child.href} className={`block rounded px-3 py-2 text-xs ${pathname===child.href?"bg-white/10 text-white":"text-slate-500 hover:text-white"}`}>{child.label}</Link>)}</div>}</div>)}</nav>}
function NavLink({item,pathname,onNavigate}:{item:NavItem;pathname:string;onNavigate?:()=>void}){const Icon=item.icon,active=item.href==="/finance"?pathname.startsWith("/finance"):pathname.startsWith(item.href);return <Link onClick={onNavigate} href={item.href} className={`mb-1 flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${active?item.href==="/finance"?"bg-emerald-600 text-white":"bg-blue-600 text-white":"text-slate-400 hover:bg-white/5 hover:text-white"}`}>{Icon&&<Icon size={18}/>} {item.label}</Link>}

function Brand({close}:{close?:()=>void}){return <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5"><div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-600"><ShieldCheck size={20}/></div><div className="flex-1"><b>MK Digital</b><div className="text-xs text-slate-400">VAULT</div></div>{close&&<button type="button" onClick={close} className="grid h-10 w-10 place-items-center rounded-lg text-slate-300 hover:bg-white/10" aria-label="Menüyü kapat"><X size={21}/></button>}</div>}

function SignOut(){const router=useRouter(),[pending,setPending]=useState(false);async function run(){if(pending)return;setPending(true);const {error}=await createClient().auth.signOut();if(error){toast.error("Çıkış yapılamadı. Lütfen tekrar deneyin.");setPending(false);return}router.replace("/login");router.refresh()}return <div className="border-t border-white/10 p-3"><button type="button" onClick={run} disabled={pending} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 disabled:opacity-60">{pending?<Loader2 className="animate-spin" size={18}/>:<LogOut size={18}/>} {pending?"Çıkış yapılıyor...":"Çıkış yap"}</button></div>}

export function Sidebar(){const pathname=usePathname();return <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-white/10 bg-[#10131a] text-white lg:flex"><Brand/><Navigation pathname={pathname}/><SignOut/></aside>}

function MobileDrawer({open,close}:{open:boolean;close:()=>void}){const pathname=usePathname();useEffect(()=>{if(!open)return;const key=(event:KeyboardEvent)=>event.key==="Escape"&&close();document.addEventListener("keydown",key);document.body.style.overflow="hidden";return()=>{document.removeEventListener("keydown",key);document.body.style.overflow=""}},[open,close]);if(!open)return null;return <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-slate-950/60" onClick={close} aria-label="Menüyü kapat"/><aside className="relative flex h-full w-[84%] max-w-sm flex-col bg-[#10131a] text-white shadow-2xl"><Brand close={close}/><Navigation pathname={pathname} onNavigate={close}/><SignOut/></aside></div>}

export function Header({title,description}:{title:string;description?:string}){const pathname=usePathname(),[menuOpen,setMenuOpen]=useState(false),projectMatch=pathname.match(/^\/projects\/([^/]+)$/);return <><header className="flex min-h-20 items-center justify-between gap-3 border-b bg-white px-4 lg:px-8"><div className="flex min-w-0 items-center gap-3"><button type="button" onClick={()=>setMenuOpen(true)} className="btn min-h-11 shrink-0 px-3 lg:hidden" aria-label="Menüyü aç" aria-expanded={menuOpen}><Menu size={20}/><span className="hidden min-[390px]:inline">Menü</span></button><div className="min-w-0"><h1 className="truncate text-lg font-bold sm:text-xl">{title}</h1>{description&&<p className="mt-1 hidden truncate text-sm muted sm:block">{description}</p>}</div></div><div className="flex shrink-0 items-center gap-3">{projectMatch&&<Link href={`/projects/${projectMatch[1]}/edit`} className="btn hidden sm:inline-flex">Projeyi düzenle</Link>}<div className="hidden items-center gap-2 rounded-lg border px-3 py-2 text-sm text-slate-500 md:flex"><Search size={16}/>Hızlı ara</div><div className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-sm text-white">MK</div></div></header><MobileDrawer open={menuOpen} close={()=>setMenuOpen(false)}/></>}
