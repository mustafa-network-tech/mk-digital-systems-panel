import Link from "next/link";
import {Header} from "@/components/sidebar";
import {ProjectFormFields} from "@/components/project-form-fields";
import {createClient} from "@/lib/supabase/server";
import {createProject} from "@/app/actions";

export default async function Page(){const supabase=await createClient(),{data:customers}=await supabase.from("customers").select("id,name").order("name");return <><Header title="Yeni Proje" description="Proje, kaynak, yayın ve veritabanı bilgilerini ekleyin."/><form action={createProject} className="mx-auto max-w-5xl space-y-6 p-5 lg:p-8"><ProjectFormFields customers={customers||[]}/><div className="flex justify-end gap-3"><Link href="/projects" className="btn">İptal</Link><button className="btn btn-primary">Projeyi oluştur</button></div></form></>}
