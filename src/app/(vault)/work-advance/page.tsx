import {Header} from "@/components/sidebar";
import {WorkAdvanceDashboard} from "@/components/work-advance";
import {getWorkAdvance} from "@/lib/work-advance";

export default async function Page({searchParams}:{searchParams:Promise<{month?:string}>}){const {month}=await searchParams,{range,advances,expenses}=await getWorkAdvance(month);return <><Header title="İş Avansı" description="Şirket avansları ve iş harcamaları"/><WorkAdvanceDashboard month={range.value} advances={advances} expenses={expenses}/></>}
