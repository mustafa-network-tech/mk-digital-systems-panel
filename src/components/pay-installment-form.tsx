"use client";

import {payInstallment} from "@/app/actions";

export function PayInstallmentForm({id,name,sequence}:{id:string;name:string;sequence:number}){
 return <form action={payInstallment} onSubmit={event=>{if(!window.confirm(`“${name}” için ${sequence}. taksit ödendi olarak işaretlensin mi?`))event.preventDefault()}}>
  <input type="hidden" name="id" value={id}/>
  <button type="submit" className="btn btn-primary">Öde</button>
 </form>
}
