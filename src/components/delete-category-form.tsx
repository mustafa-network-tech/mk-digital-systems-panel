"use client";

import {Trash2} from "lucide-react";
import {deleteCategory} from "@/app/actions";

export function DeleteCategoryForm({id,name}:{id:string;name:string}){
 return <form action={deleteCategory} onSubmit={event=>{if(!window.confirm(`“${name}” kategorisi silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?`))event.preventDefault()}}>
  <input type="hidden" name="id" value={id}/>
  <button type="submit" aria-label={`${name} kategorisini sil`} className="btn py-1.5 text-red-600"><Trash2 size={16}/>Sil</button>
 </form>
}
