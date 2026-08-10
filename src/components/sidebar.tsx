"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BriefcaseBusiness, FolderKanban, Globe2, LayoutDashboard, Loader2, LogOut, Search, Settings, ShieldCheck, Users, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

const nav = [["/dashboard", "Dashboard", LayoutDashboard], ["/projects", "Projeler", FolderKanban], ["/customers", "Müşteriler", Users], ["/domains", "Domainler", Globe2], ["/settings", "Ayarlar", Settings]] as const;
const finance = [["/finance", "Genel Bakış"], ["/finance/income", "Gelirler"], ["/finance/expenses", "Giderler"], ["/finance/installments", "Taksitler"], ["/finance/cash", "Kasa"], ["/finance/history", "Geçmiş / İstatistikler"]] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    console.log("Çıkış Yap tıklaması tetiklendi");
    if (isSigningOut) return;
    setIsSigningOut(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Supabase çıkış hatası:", error);
      toast.error("Çıkış yapılamadı. Lütfen tekrar deneyin.");
      setIsSigningOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  return <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-white/10 bg-[#10131a] text-white lg:flex lg:flex-col">
    <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6"><div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-600"><ShieldCheck size={20}/></div><div><b>MK Digital</b><div className="text-xs text-slate-400">VAULT</div></div></div>
    <nav className="flex-1 overflow-y-auto p-3">
      {nav.map(([href, label, Icon]) => <Link key={href} href={href} className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${pathname.startsWith(href) ? "bg-blue-600" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}><Icon size={18}/>{label}</Link>)}
      <div className="my-4 border-t border-white/10"/>
      <Link href="/finance" className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${pathname.startsWith("/finance") ? "bg-emerald-600" : "text-slate-400 hover:bg-white/5"}`}><WalletCards size={18}/>Kişisel Finans</Link>
      <div className="ml-6 mt-1">{finance.map(([href, label]) => <Link key={href} href={href} className="block rounded px-3 py-1.5 text-xs text-slate-500 hover:text-white">{label}</Link>)}</div>
      <Link href="/work-advance" className={`mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${pathname.startsWith("/work-advance") ? "bg-blue-600" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}><BriefcaseBusiness size={18}/>İş Avansı</Link>
    </nav>
    <div className="relative z-10 border-t border-white/10 p-3"><button type="button" onClick={handleSignOut} disabled={isSigningOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 disabled:cursor-wait disabled:opacity-60">{isSigningOut ? <Loader2 className="animate-spin" size={18}/> : <LogOut size={18}/>} {isSigningOut ? "Çıkış yapılıyor..." : "Çıkış yap"}</button></div>
  </aside>;
}

export function Header({ title, description }: { title: string; description?: string }) {
  const pathname = usePathname();
  const projectMatch = pathname.match(/^\/projects\/([^/]+)$/);
  return <header className="flex min-h-20 items-center justify-between border-b bg-white px-5 lg:px-8"><div><h1 className="text-xl font-bold">{title}</h1>{description && <p className="mt-1 text-sm muted">{description}</p>}</div><div className="flex items-center gap-3">{projectMatch&&<Link href={`/projects/${projectMatch[1]}/edit`} className="btn">Projeyi düzenle</Link>}<div className="hidden items-center gap-2 rounded-lg border px-3 py-2 text-sm text-slate-500 md:flex"><Search size={16}/>Hızlı ara</div><div className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-sm text-white">MK</div></div></header>;
}
