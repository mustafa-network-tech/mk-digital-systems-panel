import Link from "next/link";
import {Header} from "@/components/sidebar";
import {ProjectFormFields} from "@/components/project-form-fields";
import {createClient} from "@/lib/supabase/server";
import {createProject} from "@/app/actions";
import type {ProjectCategoryNode} from "@/lib/types";
export default async function Page(){const supabase=await createClient(),[{data:customers},{data:categoryData,error}]=await Promise.all([supabase.from("customers").select("id,name").order("name"),supabase.from("project_categories").select("id,name,parent_id,project_group,customer_status,category_type,system_key,sort_order").order("sort_order").order("name")]);if(error)throw new Error(error.message);return <><Header title="Yeni Proje" description="Proje, kategori, kaynak, yayın ve veritabanı bilgilerini ekleyin."/><form action={createProject} className="mx-auto max-w-5xl space-y-6 p-5 lg:p-8"><ProjectFormFields customers={customers||[]} categories={(categoryData||[]) as ProjectCategoryNode[]}/><div className="flex justify-end gap-3"><Link href="/projects" className="btn">İptal</Link><button className="btn btn-primary">Projeyi oluştur</button></div></form></>}
