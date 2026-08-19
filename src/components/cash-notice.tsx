"use client";
import {useEffect} from "react";
import {usePathname,useRouter,useSearchParams} from "next/navigation";
import {toast} from "sonner";
export function CashNotice(){const params=useSearchParams(),pathname=usePathname(),router=useRouter(),error=params.get("error"),success=params.get("success");useEffect(()=>{const message=error||success;if(!message)return;(error?toast.error:toast.success)(message,{duration:3000});const clean=new URLSearchParams(params.toString());clean.delete("error");clean.delete("success");router.replace(`${pathname}${clean.size?`?${clean}`:""}`,{scroll:false})},[error,success,params,pathname,router]);return null}
