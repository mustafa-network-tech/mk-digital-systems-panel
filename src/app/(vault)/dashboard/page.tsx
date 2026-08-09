import Link from "next/link";
import { Activity, Building2, CheckCircle2, FolderKanban, ShieldAlert, Users } from "lucide-react";
import { Header } from "@/components/sidebar";
import { Status } from "@/components/status";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/types";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*,customers(name)")
    .eq("archived", false)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  const projects = (data ?? []) as Project[];
  const internalProjects = projects.filter((project) => !project.customer_id);
  const customerProjects = projects.filter((project) => Boolean(project.customer_id));
  const generalStats = [
    ["Toplam Proje", projects.length, FolderKanban, "#2563eb"],
    ["Toplam Aktif", countStatus(projects, "aktif"), Activity, "#16a34a"],
    ["Toplam Tamamlanan", countStatus(projects, "tamamlandi"), CheckCircle2, "#0891b2"],
    ["Kritik Proje", projects.filter((project) => project.critical || project.health_status === "critical").length, ShieldAlert, "#dc2626"],
  ] as const;

  return <>
    <Header title="Dashboard" description="MK Digital Systems ve müşteri projelerinin operasyon özeti."/>
    <div className="space-y-7 p-5 lg:p-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Genel Sistem Özeti</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {generalStats.map(([label, value, Icon, color]) => <div className="card flex items-center gap-4 p-4" key={label}>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50"><Icon size={18} color={color}/></div>
            <div><div className="text-xl font-bold">{value}</div><div className="text-sm muted">{label}</div></div>
          </div>)}
        </div>
      </section>

      <ProjectSection
        title="MK Digital Systems Projeleri"
        description="Şirket içi ürünler ve operasyon projeleri"
        projects={internalProjects}
        icon={Building2}
        accent="blue"
        emptyText="Henüz MK Digital Systems projesi bulunmuyor."
      />

      <ProjectSection
        title="Müşteri Projeleri"
        description="Müşterilere bağlı yürütülen projeler"
        projects={customerProjects}
        icon={Users}
        accent="violet"
        emptyText="Henüz müşteriye ait proje bulunmuyor."
      />
    </div>
  </>;
}

function ProjectSection({ title, description, projects, icon: Icon, accent, emptyText }: { title: string; description: string; projects: Project[]; icon: typeof Building2; accent: "blue" | "violet"; emptyText: string }) {
  const stats = [
    ["Toplam", projects.length],
    ["Aktif", countStatus(projects, "aktif")],
    ["Geliştiriliyor", countStatus(projects, "gelistiriliyor")],
    ["Tamamlandı", countStatus(projects, "tamamlandi")],
    ["Kritik", projects.filter((project) => project.critical || project.health_status === "critical").length],
  ];
  const color = accent === "blue" ? "text-blue-600 bg-blue-50" : "text-violet-600 bg-violet-50";

  return <section className="card overflow-hidden">
    <div className="flex flex-col justify-between gap-4 border-b p-5 lg:flex-row lg:items-center">
      <div className="flex items-center gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-lg ${color}`}><Icon size={20}/></div>
        <div><h2 className="font-bold">{title}</h2><p className="mt-0.5 text-sm muted">{description}</p></div>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {stats.map(([label, value]) => <div className="min-w-16 rounded-lg border bg-slate-50 px-3 py-2 text-center" key={label}>
          <div className="font-bold">{value}</div><div className="mt-0.5 text-[11px] muted">{label}</div>
        </div>)}
      </div>
    </div>
    <div className="flex items-center justify-between border-b px-5 py-3"><h3 className="text-sm font-semibold">Son Güncellenen Projeler</h3><Link href="/projects" className="text-xs font-semibold text-blue-600">Tümünü gör →</Link></div>
    {projects.length ? <div className="overflow-x-auto"><table><thead><tr><th>Proje</th><th>{accent === "blue" ? "Proje Sahibi" : "Müşteri"}</th><th>Durum</th><th>Güncelleme</th></tr></thead><tbody>{projects.slice(0, 5).map((project) => <tr key={project.id}><td><div className="flex items-center gap-2">{project.health_status === "healthy" && <span className="h-2.5 w-2.5 rounded-full bg-blue-600" title="Sağlıklı"/>}<Link href={`/projects/${project.id}`} className="font-semibold hover:text-blue-600">{project.name}</Link></div></td><td className="text-sm">{project.customers?.name ?? "MK Digital Systems"}</td><td><Status value={project.status}/></td><td className="text-sm muted">{new Date(project.updated_at).toLocaleDateString("tr-TR")}</td></tr>)}</tbody></table></div> : <div className="p-10 text-center text-sm muted">{emptyText}</div>}
  </section>;
}

function countStatus(projects: Project[], status: string) {
  return projects.filter((project) => project.status === status).length;
}
