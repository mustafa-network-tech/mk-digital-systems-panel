import Link from "next/link";
import {FolderKanban,Plus} from "lucide-react";
import {Header} from "@/components/sidebar";
import {ProjectTable} from "@/components/project-table";
import {createClient} from "@/lib/supabase/server";
import type {Project} from "@/lib/types";

export default async function Page(){const supabase=await createClient();const {data,error}=await supabase.from("projects").select("*,customers(name),project_technologies(technologies(id,name))").eq("archived",false).order("updated_at",{ascending:false});if(error)throw new Error(error.message);const projects=(data||[]) as Project[];return <><Header title="Projeler" description="Kişisel ve müşteri projelerinin operasyon merkezi."/><div className="space-y-4 p-4 sm:p-5 lg:p-6"><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/20"><FolderKanban size={19}/></div><div><h2 className="font-bold text-slate-900">Proje Envanteri</h2><p className="text-xs text-slate-500">{projects.length} aktif kayıt</p></div></div><Link href="/projects/new" className="btn btn-primary"><Plus size={16}/>Yeni Proje</Link></div><ProjectTable projects={projects}/></div></>}
