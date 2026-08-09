import {clsx,type ClassValue} from "clsx";import {twMerge} from "tailwind-merge";export const cn=(...v:ClassValue[])=>twMerge(clsx(v));
export function formatBytes(n:number){if(!n)return "0 B";const u=["B","KB","MB","GB"];const i=Math.floor(Math.log(n)/Math.log(1024));return `${(n/1024**i).toFixed(i?1:0)} ${u[i]}`}
export function isBlockedFile(name:string){const n=name.toLowerCase();return /^\.env($|\.)/.test(n)||/\.(pem|key)$/.test(n)||n==="service-account.json"}
export async function sha256(file:File){const hash=await crypto.subtle.digest("SHA-256",await file.arrayBuffer());return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("")}
