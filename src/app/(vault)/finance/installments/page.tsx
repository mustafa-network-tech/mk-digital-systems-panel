import {Header} from "@/components/sidebar";
import {getFinance} from "@/lib/finance";
import {FinanceNav,InstallmentForm,Installments,MonthPicker} from "@/components/finance";
import {money} from "@/lib/utils";

export default async function Page({searchParams}:{searchParams:Promise<{month?:string}>}){
 const {month}=await searchParams,{range,installments}=await getFinance(month);
 const [selectedYear,selectedMonth]=range.value.split("-").map(Number);
 const scheduled=installments.flatMap(installment=>{
  const [startYear,startMonth]=installment.start_date.slice(0,7).split("-").map(Number);
  const sequence=(selectedYear-startYear)*12+(selectedMonth-startMonth)+1;
  if(sequence<1||sequence>installment.installment_count||!installment.include_in_monthly_total)return [];
  const payment=(installment.finance_installment_payments||[]).find(item=>item.installment_sequence===sequence);
  return [{installment,sequence,payment}];
 });
 const total=scheduled.reduce((sum,item)=>sum+Number(item.installment.installment_amount),0);
 const paid=scheduled.reduce((sum,item)=>sum+(item.payment?Number(item.payment.amount):0),0);
 const remaining=Math.max(0,total-paid);
 return <><Header title="Taksitler" description="Aylık ödeme planı yalnızca bilgi amaçlıdır; gideri ve kasa bakiyesini etkilemez."/><div className="space-y-5 p-5 lg:p-8"><div className="flex flex-wrap justify-between gap-4"><FinanceNav/><MonthPicker value={range.value} path="/finance/installments"/></div><div className="grid gap-3 sm:grid-cols-3"><SummaryCard label="Bu Ay Toplam Taksit" value={total}/><SummaryCard label="Bu Ay Ödenen" value={paid} tone="green"/><SummaryCard label="Bu Ay Kalan" value={remaining} tone={remaining>0?"amber":"green"}/></div><p className="text-xs muted">Yalnızca “Aylık genel taksit toplamına dahil et” seçili kayıtlar hesaplanır. Bu rakamlar kasa ve gider tablosuna işlenmez.</p><InstallmentForm/><section><h2 className="mb-3 font-bold">Aktif Taksitler</h2><Installments items={installments.filter(item=>item.status!=="completed")}/></section></div></>
}

function SummaryCard({label,value,tone="blue"}:{label:string;value:number;tone?:"blue"|"green"|"amber"}){const color={blue:"text-blue-700",green:"text-emerald-600",amber:"text-amber-600"}[tone];return <div className="card p-4"><div className={`text-xl font-bold ${color}`}>{money(value)}</div><div className="mt-1 text-sm muted">{label}</div></div>}
