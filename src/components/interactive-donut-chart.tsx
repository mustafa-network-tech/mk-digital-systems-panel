"use client";

import {useState} from "react";
import {money} from "@/lib/utils";

const colors=["#2563eb","#7c3aed","#059669","#d97706","#dc2626","#0891b2","#db2777","#65a30d","#9333ea","#0284c7","#ea580c","#475569"];
type Item={name:string;value:number};

export function InteractiveDonutChart({items,emptyText}:{items:Item[];emptyText:string}){
 const clean=items.filter(item=>item.value>0),total=clean.reduce((sum,item)=>sum+item.value,0),[hovered,setHovered]=useState<number|null>(null);
 if(!total)return <div className="p-10 text-center text-sm muted">{emptyText}</div>;
 const segments=clean.map((item,index)=>({
  ...item,index,percent:item.value/total*100,
  offset:clean.slice(0,index).reduce((sum,previous)=>sum+previous.value,0)/total*100
 }));
 const active=hovered===null?null:segments[hovered];
 return <div className="flex flex-col items-center gap-6 p-5 sm:flex-row"><div className="relative h-48 w-48 shrink-0"><svg viewBox="0 0 176 176" className="h-full w-full" role="img" aria-label="Gider dağılımı"><circle cx="88" cy="88" r="64" fill="none" stroke="#e2e8f0" strokeWidth="28"/>{segments.map(segment=><circle key={segment.name} cx="88" cy="88" r="64" pathLength="100" fill="none" stroke={colors[segment.index%colors.length]} strokeWidth={hovered===segment.index?34:28} strokeDasharray={`${segment.percent} ${100-segment.percent}`} strokeDashoffset={-segment.offset} strokeLinecap="butt" transform="rotate(-90 88 88)" className="cursor-pointer transition-[stroke-width] duration-150" onMouseEnter={()=>setHovered(segment.index)} onMouseLeave={()=>setHovered(null)}><title>{segment.name} · %{segment.percent.toFixed(1)} · {money(segment.value)}</title></circle>)}</svg><div className="pointer-events-none absolute inset-9 grid place-items-center rounded-full bg-white text-center">{active?<div><b className="block text-sm">{active.name}</b><span className="block text-xs font-semibold text-blue-600">%{active.percent.toFixed(1)}</span><span className="block text-[11px] muted">{money(active.value)}</span></div>:<div><b>{money(total)}</b><div className="text-xs muted">Toplam</div></div>}</div></div><div className="w-full space-y-2">{segments.map(segment=><div className={`flex items-center gap-2 rounded px-1 text-sm transition-colors ${hovered===segment.index?"bg-slate-100":""}`} key={segment.name} onMouseEnter={()=>setHovered(segment.index)} onMouseLeave={()=>setHovered(null)}><span className="h-2.5 w-2.5 rounded-full" style={{background:colors[segment.index%colors.length]}}/><span className="flex-1">{segment.name}</span><b>%{segment.percent.toFixed(1)}</b><span className="w-28 text-right muted">{money(segment.value)}</span></div>)}</div></div>
}
