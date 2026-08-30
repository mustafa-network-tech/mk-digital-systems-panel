"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import type {ProjectCategoryNode,ProjectGroup} from "@/lib/types";

export function ProjectCategoryFields({categories,initialId}:{categories:ProjectCategoryNode[];initialId?:string|null}){
  const containerRef=useRef<HTMLDivElement>(null);
  const byId=useMemo(()=>new Map(categories.map(category=>[category.id,category])),[categories]);
  const initialPath=useMemo(()=>categoryPath(initialId||"",byId),[initialId,byId]);
  const initialNode=initialId?byId.get(initialId):undefined;
  const [group,setGroup]=useState<ProjectGroup>(initialNode?.project_group||"portfolio");
  const [status,setStatus]=useState(initialNode?.customer_status||"fikir");
  const [selectedIds,setSelectedIds]=useState<string[]>(initialPath.map(category=>category.id));

  useEffect(()=>{
    const form=containerRef.current?.closest("form");
    if(!form)return;
    const syncScope=()=>{
      const nextGroup=(form.elements.namedItem("project_group") as HTMLSelectElement|null)?.value as ProjectGroup|undefined;
      const nextStatus=(form.elements.namedItem("status") as HTMLSelectElement|null)?.value;
      if(nextGroup)setGroup(nextGroup);
      if(nextStatus)setStatus(nextStatus);
    };
    syncScope();
    form.addEventListener("change",syncScope);
    return ()=>form.removeEventListener("change",syncScope);
  },[]);

  const roots=useMemo(()=>sortCategories(categories.filter(category=>
    !category.parent_id&&category.project_group===group&&
    (group!=="customer_project"||category.customer_status===status)
  )),[categories,group,status]);
  const validSelectedIds:string[]=[];
  for(const id of selectedIds){
    const node=byId.get(id);
    const expectedParent=validSelectedIds.at(-1)||null;
    if(!node||node.project_group!==group||node.parent_id!==expectedParent)break;
    if(group==="customer_project"&&node.customer_status!==status)break;
    validSelectedIds.push(id);
  }
  const levels:ProjectCategoryNode[][]=[roots];
  for(const selectedId of validSelectedIds){
    const children=sortCategories(categories.filter(category=>category.parent_id===selectedId));
    if(!children.length)break;
    levels.push(children);
  }
  const selectedNode=validSelectedIds.length?byId.get(validSelectedIds.at(-1)!):undefined;
  const hasChildren=selectedNode?categories.some(category=>category.parent_id===selectedNode.id):false;
  const finalValue=selectedNode&&!hasChildren?selectedNode.id:"";

  function selectLevel(level:number,value:string){
    setSelectedIds(value?[...validSelectedIds.slice(0,level),value]:validSelectedIds.slice(0,level));
  }

  return <div ref={containerRef} className="grid gap-4 md:col-span-2 md:grid-cols-2">
    {levels.map((options,level)=><label className="text-sm" key={level}>{level===0?"Kategori":level===1?"Alt kategori":`${level}. seviye alt kategori`}
      <select value={validSelectedIds[level]||""} onChange={event=>selectLevel(level,event.target.value)} className="field mt-2" required>
        <option value="">{level===0?"Kategori seçin":"Alt kategori seçin"}</option>
        {options.map(option=><option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
    </label>)}
    <input type="hidden" name="project_category_id" value={finalValue}/>
    {!roots.length&&<p className="text-sm text-amber-700 md:col-span-2">Bu proje grubu ve durumu için seçilebilir kategori bulunmuyor.</p>}
    <p className="text-xs text-slate-500 md:col-span-2">Proje grubuna uygun kategoriler gösterilir. Seçilen kategorinin alt kategorisi varsa proje kaydedilmeden önce alt kategori seçilmelidir.</p>
  </div>;
}

function categoryPath(id:string,byId:Map<string,ProjectCategoryNode>){
  const path:ProjectCategoryNode[]=[];
  let node=byId.get(id);
  while(node){path.unshift(node);node=node.parent_id?byId.get(node.parent_id):undefined}
  return path;
}

function sortCategories(categories:ProjectCategoryNode[]){
  return [...categories].sort((a,b)=>a.sort_order-b.sort_order||a.name.localeCompare(b.name,"tr"));
}
