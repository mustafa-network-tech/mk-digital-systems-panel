"use client";

import {Trash2} from "lucide-react";
import {deleteInstallment} from "@/app/actions";

export function DeleteInstallmentForm({id,name}:{id:string;name:string}){
 return <form action={deleteInstallment} onSubmit={event=>{if(!window.confirm(`“${name}” taksiti ve ödeme geçmişi silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?`))event.preventDefault()}}>
  <input type="hidden" name="id" value={id}/>
  <button type="submit" aria-label={`${name} taksidini sil`} className="btn w-full text-red-600"><Trash2 size={16}/>Sil</button>
 </form>
}
