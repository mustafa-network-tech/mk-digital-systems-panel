"use client";

import {Plus,Trash2} from "lucide-react";
import {useMemo,useState} from "react";

type CustomerOption={id:string;name:string};
const ROOT="MK Digital Systems Projects";
const groups={portfolio:"Portföy",customer_project:"Müşteri Dosyaları"} as const;
const categories={panel:"Paneller",application:"Uygulamalar",website:"Web Siteleri",game:"Oyunlar"} as const;
type Group=keyof typeof groups;
type Category=keyof typeof categories;

export function ProjectPathFields({customers,initial}:{customers:CustomerOption[];initial:Record<string,string|null|undefined>}){
  const [name,setName]=useState(initial.name||"");
  const [group,setGroup]=useState<Group>((initial.project_group as Group)||"portfolio");
  const [category,setCategory]=useState<Category|"">((initial.category as Category)||"");
  const parsed=parseExistingPath(initial.local_source_path,initial.name);
  const legacyPath=Boolean(initial.local_source_path&&!isManagedPath(initial.local_source_path));
  const [preserveLegacy,setPreserveLegacy]=useState(legacyPath);
  const [subfolders,setSubfolders]=useState<string[]>(parsed.subfolders);
  const [folderName,setFolderName]=useState(parsed.folderName||initial.name||"");
  const [customFolder,setCustomFolder]=useState(Boolean(parsed.folderName&&parsed.folderName!==initial.name));
  const parts=useMemo(()=>[ROOT,groups[group],category?categories[category]:"Kategori seçilmedi",...subfolders.map(cleanPart).filter(Boolean),cleanPart(folderName||name)||"Proje adı"],[group,category,subfolders,folderName,name]);
  const complete=Boolean(category&&cleanPart(folderName||name));
  const storedPath=complete?[ROOT,groups[group],categories[category as Category],...subfolders.map(cleanPart).filter(Boolean),cleanPart(folderName||name)].join("/"):"";
  function changeName(value:string){setName(value);if(!customFolder)setFolderName(value)}
  return <>
    <FieldLabel label="Proje adı"><input required name="name" value={name} onChange={event=>changeName(event.target.value)} className="field mt-2"/></FieldLabel>
    <FieldLabel label="Kısa ad / kod"><input name="short_name" defaultValue={initial.short_name||""} className="field mt-2"/></FieldLabel>
    <FieldLabel label="Proje grubu"><select name="project_group" value={group} onChange={event=>setGroup(event.target.value as Group)} className="field mt-2"><option value="customer_project">Müşteri Projesi</option><option value="portfolio">Kişisel Proje</option></select></FieldLabel>
    <FieldLabel label="Kategori"><select required name="category" value={category} onChange={event=>setCategory(event.target.value as Category|"")} className="field mt-2"><option value="">Kategori seçin</option><option value="panel">Panel</option><option value="application">Uygulama</option><option value="website">Web Sitesi</option><option value="game">Oyun</option></select></FieldLabel>
    <FieldLabel label="Müşteri"><select name="customer_id" defaultValue={initial.customer_id||""} className="field mt-2"><option value="">Müşteri seçilmedi</option>{customers.map(customer=><option value={customer.id} key={customer.id}>{customer.name}</option>)}</select></FieldLabel>
    <div/>
    <div className="md:col-span-2"><div className="flex items-center justify-between gap-3"><div className="text-sm font-medium">İsteğe bağlı alt klasörler</div><button type="button" onClick={()=>setSubfolders(items=>[...items,""])} className="btn"><Plus size={15}/>Alt klasör ekle</button></div>{subfolders.length?<div className="mt-3 space-y-2">{subfolders.map((subfolder,index)=><div className="flex gap-2" key={index}><input value={subfolder} onChange={event=>setSubfolders(items=>items.map((item,itemIndex)=>itemIndex===index?event.target.value:item))} className="field" placeholder="Örn. WordPress"/><button type="button" onClick={()=>setSubfolders(items=>items.filter((_,itemIndex)=>itemIndex!==index))} className="btn px-3" aria-label="Alt klasörü kaldır"><Trash2 size={16}/></button></div>)}</div>:<p className="mt-2 text-xs muted">Alt klasör gerekmiyorsa bu alanı boş bırakın.</p>}</div>
    <FieldLabel label="Son klasör adı"><input required value={folderName} onChange={event=>{setFolderName(event.target.value);setCustomFolder(event.target.value!==name)}} className="field mt-2" placeholder={name||"Proje adı"}/><button type="button" onClick={()=>{setFolderName(name);setCustomFolder(false)}} className="mt-2 text-xs font-semibold text-blue-600">Proje adını kullan</button></FieldLabel>
    {legacyPath&&<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 md:col-span-2"><label className="flex items-start gap-3 text-sm"><input type="checkbox" name="preserve_local_source_path" checked={preserveLegacy} onChange={event=>setPreserveLegacy(event.target.checked)} className="mt-1"/><span><b>Mevcut klasör yolu bu düzenlemede korunsun</b><span className="mt-1 block text-xs text-amber-800">Kayıt eski veya mutlak yol biçiminde. İşaretli bırakılırsa veritabanındaki mevcut değer değiştirilmez. İşareti kaldırırsanız aşağıdaki taşınabilir mantıksal yol kaydedilir.</span></span></label></div>}
    <div className="rounded-lg border bg-slate-50 p-4 md:col-span-2"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Oluşturulan mantıksal yol</div><div className="mt-2 break-words font-mono text-sm font-semibold text-slate-800">{parts.join(" / ")}</div><p className="mt-2 text-xs muted">Klasörler otomatik oluşturulmaz. Fiziksel klasörleri siz oluşturursunuz; burada yalnızca MK Digital Systems Projects kökünden başlayan taşınabilir yol kaydedilir.{legacyPath&&preserveLegacy?" Mevcut yol koruma seçeneği açık olduğu için bu önizleme henüz kaydedilmeyecektir.":""}</p></div>
    <input type="hidden" name="local_source_path" value={storedPath}/>
  </>;
}

function FieldLabel({label,children}:{label:string;children:React.ReactNode}){return <label className="text-sm">{label}{children}</label>}
function cleanPart(value:string){return value.trim().replace(/[\\/:*?"<>|]+/g," ").replace(/\s+/g," ").replace(/^\.+|\.+$/g,"").trim()}
function parseExistingPath(path:string|null|undefined,projectName:string|null|undefined){if(!path||!isManagedPath(path))return {subfolders:[] as string[],folderName:projectName||""};const parts=path.replace(/\\/g,"/").split("/").map(part=>part.trim()).filter(Boolean);return {subfolders:parts.slice(3,-1),folderName:parts.at(-1)||projectName||""}}
function isManagedPath(path:string){const parts=path.replace(/\\/g,"/").split("/").map(part=>part.trim()).filter(Boolean);return parts.length>=4&&parts[0]===ROOT&&Object.values(groups).includes(parts[1] as typeof groups[Group])&&Object.values(categories).includes(parts[2] as typeof categories[Category])}
