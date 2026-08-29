import Link from "next/link";
import {Plus} from "lucide-react";
import {Header} from "@/components/sidebar";
import {ProjectTable} from "@/components/project-table";
import {createClient} from "@/lib/supabase/server";
import type {Project} from "@/lib/types";

export default async function Page(){
  const supabase=await createClient();
  const {data,error}=await supabase.from("projects").select("*,customers(name),project_technologies(technologies(id,name))").eq("archived",false).order("updated_at",{ascending:false});
  if(error)throw new Error(error.message);
  const projects=(data||[]) as Project[];
  return <><Header title="Projeler" description="Müşteri projeleri ve portföy çalışmalarını tek listeden yönetin."/><div className="space-y-5 p-5 lg:p-8"><div className="flex items-center justify-between gap-4"><div><h2 className="font-bold">Tüm Projeler</h2><p className="mt-1 text-sm muted">{projects.length} proje</p></div><Link href="/projects/new" className="btn btn-primary"><Plus size={17}/>Yeni Proje</Link></div><ProjectTable projects={projects}/></div></>;
}
