"use client";

import {Eye,EyeOff} from "lucide-react";
import {useState} from "react";

export function MaskedValue({value,empty="—",href=false}:{value:string|null|undefined;empty?:string;href?:boolean}){
  const [visible,setVisible]=useState(false);
  if(!value)return <span className="text-slate-400">{empty}</span>;
  return <span className="inline-flex min-w-0 items-center justify-end gap-2">
    <span className={`max-w-64 truncate ${visible?"":"select-none tracking-widest text-slate-500"}`}>
      {visible?(href?<a href={value} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{value}</a>:value):"••••••••••••"}
    </span>
    <button type="button" onClick={()=>setVisible(x=>!x)} className="grid h-8 w-8 shrink-0 place-items-center rounded-md border bg-white text-slate-500 hover:text-slate-900" aria-label={visible?"Bilgiyi gizle":"Bilgiyi göster"} title={visible?"Ekran görüntüsü için gizle":"Bilgiyi göster"}>
      {visible?<EyeOff size={15}/>:<Eye size={15}/>} 
    </button>
  </span>;
}
