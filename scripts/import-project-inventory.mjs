import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {existsSync,readdirSync,readFileSync,mkdirSync,writeFileSync} from "node:fs";
import {dirname,join,relative,resolve,sep} from "node:path";

const WORKSPACE=process.cwd();
const INVENTORY_ROOT=resolve(WORKSPACE,"..","..","..");
const APPLY=process.argv.includes("--apply");
const INVENTORY_ONLY=process.argv.includes("--inventory-only");
const STARTUP_CHECK=process.argv.includes("--startup-check");
const BACKUP_DRY_RUN=process.argv.includes("--backup-dry-run");
const ROOT_LABEL="MK Digital Systems Projects";
const EXCLUDED=new Set([".git","node_modules",".next",".dart_tool",".gradle",".idea","build","dist","out","coverage",".cache","__pycache__","tmp","temp"]);
const CATEGORIES={paneller:"panel",uygulamalar:"application","web siteleri":"website",oyun:"game",oyunlar:"game"};
const SAFE_FIELDS=["short_description","detailed_description","project_group","category","status","local_source_path","github_repo","github_repo_name","github_default_branch","readme_content","readme_source","readme_hash","readme_synced_at"];
const LEGACY_NAME_ALIASES=new Map([["mk field ops",["mk ops"]],["schnappli",["schannapli"]],["mavi kadraj next js",["mavi kadraj"]]]);

class RestClient{
  constructor(url,key,token){this.base=`${url}/rest/v1`;this.headers={apikey:key,Authorization:`Bearer ${token}`,"Content-Type":"application/json"}}
  async request(path,options={}){const response=await fetch(`${this.base}/${path}`,{...options,headers:{...this.headers,...options.headers}});if(!response.ok)throw new Error(`Supabase isteği başarısız (${response.status}): ${await response.text()}`);const text=await response.text();return text?JSON.parse(text):null}
  select(table,query){return this.request(`${table}?${query}`)}
  insert(table,record){return this.request(table,{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(record)})}
  async insertReturning(table,record){const rows=await this.request(table,{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(record)});return rows[0]}
  insertIgnore(table,record){return this.request(table,{method:"POST",headers:{Prefer:"resolution=ignore-duplicates,return=minimal"},body:JSON.stringify(record)})}
  update(table,id,patch){return this.request(`${table}?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify(patch)})}
}

loadDotEnv(join(WORKSPACE,".env.local"));
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if(!SUPABASE_URL||!SUPABASE_ANON_KEY)fail("Supabase public bağlantı değişkenleri bulunamadı.");
if(STARTUP_CHECK){const client=new RestClient(SUPABASE_URL,SUPABASE_ANON_KEY,"startup-check");if(!client.base.endsWith("/rest/v1"))fail("RestClient başlangıç kontrolü başarısız.");console.log("Başlangıç kontrolü başarılı. Kimlik bilgisi istenmedi, ağ isteği ve veri yazma işlemi yapılmadı.");process.exit(0)}
const {candidates,manual}=discoverInventory();
if(INVENTORY_ONLY){mkdirSync(join(WORKSPACE,".local-reports"),{recursive:true});const inventoryPath=join(WORKSPACE,".local-reports",`project-inventory-${new Date().toISOString().replaceAll(":","-")}.json`);writeFileSync(inventoryPath,JSON.stringify({created_at:new Date().toISOString(),candidates,manual},null,2));console.log(`Aday: ${candidates.length}\nManuel/belirsiz: ${manual.length}\nRapor: ${relative(WORKSPACE,inventoryPath)}`);process.exit(0)}
if(BACKUP_DRY_RUN){const files=existsSync(join(WORKSPACE,".local-backups"))?readdirSync(join(WORKSPACE,".local-backups")).filter(name=>name.startsWith("projects-before-import-")&&name.endsWith(".json")).sort():[],latest=files.at(-1);if(!latest)fail("Yerel projects yedeği bulunamadı.");const backup=JSON.parse(readFileSync(join(WORKSPACE,".local-backups",latest),"utf8")),offlinePlan=buildPlan(candidates,backup.projects);console.log(`YEDEKTEN DRY-RUN\nEklenecek: ${offlinePlan.insert.length}\nGüncellenecek: ${offlinePlan.update.length}\nAtlanacak: ${offlinePlan.skip.length}\nManuel/belirsiz: ${manual.length}`);for(const item of offlinePlan.update)console.log(`- UPDATE ${item.name} | ${item.fields.join(", ")} | teknoloji: ${item.technologies.join(", ")}`);process.exit(0)}
const session=await signIn();
const api=new RestClient(SUPABASE_URL,SUPABASE_ANON_KEY,session.access_token);
const existing=await api.select("projects","select=*,project_technologies(technologies(name))");
const stamp=new Date().toISOString().replaceAll(":","-");
mkdirSync(join(WORKSPACE,".local-backups"),{recursive:true});
const backupPath=join(WORKSPACE,".local-backups",`projects-before-import-${stamp}.json`);
writeFileSync(backupPath,JSON.stringify({created_at:new Date().toISOString(),count:existing.length,projects:existing},null,2));

const plan=buildPlan(candidates,existing);
const report={mode:APPLY?"apply":"dry-run",created_at:new Date().toISOString(),backup:relative(WORKSPACE,backupPath),counts:{insert:plan.insert.length,update:plan.update.length,skip:plan.skip.length,manual:manual.length},insert:plan.insert,update:plan.update,skip:plan.skip,manual};
mkdirSync(join(WORKSPACE,".local-reports"),{recursive:true});
const reportPath=join(WORKSPACE,".local-reports",`project-import-${APPLY?"apply":"dry-run"}-${stamp}.json`);
writeFileSync(reportPath,JSON.stringify(report,null,2));
printSummary(report,reportPath);

if(!APPLY){console.log("\nDry-run tamamlandı. Veri yazılmadı. Aynı planı uygulamak için --apply kullanın.");process.exit(0)}
for(const item of plan.update)if(Object.keys(item.patch).length)await api.update("projects",item.id,item.patch);
for(const item of plan.insert)await api.insert("projects",{...item.record,created_by:session.user.id});
const after=await api.select("projects","select=id,name,project_group,category,status,local_source_path");
await syncTechnologies(api,candidates,after);
console.log(`\nAktarım tamamlandı. projects kayıt sayısı: ${existing.length} → ${after.length}`);

function discoverInventory(){
  const readmes=[];walk(INVENTORY_ROOT,path=>{if(/^readme(?:\.[^.]+)?$/i.test(last(path))&&!isExcluded(path))readmes.push(path)});
  const rootReadmes=readmes.filter(path=>hasProjectMarker(dirname(path))||isExplicitReadmeProject(path));
  const byRoot=new Map(),manual=[];
  for(const readmePath of rootReadmes){const rawRoot=dirname(readmePath),projectRoot=canonicalProjectRoot(rawRoot);if(!projectRoot)continue;const key=portableRelative(projectRoot).toLocaleLowerCase("tr-TR");const previous=byRoot.get(key);if(!previous||pathDepth(readmePath)<pathDepth(previous.readmePath))byRoot.set(key,{projectRoot,readmePath})}
  for(const {projectRoot,readmePath} of byRoot.values()){
    const mapped=mapClassification(projectRoot);
    if(!mapped.category){manual.push({path:logicalPath(projectRoot),reason:"Kategori kesin olarak belirlenemedi"});continue}
    // PostgreSQL text alanları NUL (U+0000) kabul etmez. Bazı README dosyaları
    // editör/artifact kaynaklı NUL baytları içerebildiği için yalnızca bu geçersiz
    // karakteri temizle; kaynak dosyaya dokunma.
    let readme=readFileSync(readmePath,"utf8").replaceAll("\u0000","");
    if(hasSecretLikeContent(readme)){manual.push({path:logicalPath(projectRoot),reason:"README güvenlik incelemesi gerektiriyor; içerik rapora alınmadı"});continue}
    readme=readme.slice(0,100000);
    const heading=readHeading(readme),name=isUsefulHeading(heading)?heading:displayName(projectRoot),short=readShortDescription(readme,name),technologies=detectTechnologies(projectRoot,readme);
    byRoot.set(portableRelative(projectRoot).toLocaleLowerCase("tr-TR"),{name,short_description:short,detailed_description:readme.slice(0,10000),project_group:mapped.group,category:mapped.category,status:mapped.status,local_source_path:logicalPath(projectRoot),github_repo:readGitRemote(projectRoot),github_repo_name:null,github_default_branch:readGitBranch(projectRoot),readme_content:readme,readme_source:portableRelative(readmePath),readme_hash:createHash("sha256").update(readme).digest("hex"),readme_synced_at:new Date().toISOString(),technologies});
  }
  const candidates=[...byRoot.values()].filter(item=>item.name);
  for(const path of findLikelyProjectDirectories()){const logical=logicalPath(path),normalized=normalizePath(logical);if(!candidates.some(item=>normalized===normalizePath(item.local_source_path)||normalized.startsWith(`${normalizePath(item.local_source_path)}/`))&&!manual.some(item=>normalizePath(item.path)===normalized))manual.push({path:logical,reason:"Proje kök README dosyası bulunamadı"})}
  return {candidates,manual:uniqueBy(manual,item=>normalizePath(item.path))};
}

function buildPlan(candidates,existing){const insert=[],update=[],skip=[],byPath=new Map(existing.filter(item=>item.local_source_path).map(item=>[normalizePath(item.local_source_path),item]));for(const candidate of candidates){const match=findExistingMatch(candidate,existing,byPath),record=without(candidate,["technologies"]);if(!match){insert.push({name:candidate.name,path:candidate.local_source_path,technologies:candidate.technologies,record});continue}const patch={},currentTechnologies=(match.project_technologies||[]).map(link=>link.technologies?.name).filter(Boolean),missingTechnologies=candidate.technologies.filter(name=>!currentTechnologies.some(current=>normalizeName(current)===normalizeName(name)));for(const field of SAFE_FIELDS)if(isEmpty(match[field])&&!isEmpty(record[field]))patch[field]=record[field];if(Object.keys(patch).length||missingTechnologies.length)update.push({id:match.id,name:match.name,path:candidate.local_source_path,fields:Object.keys(patch),technologies:missingTechnologies,patch});else skip.push({id:match.id,name:match.name,path:candidate.local_source_path,reason:"Mevcut kayıt dolu; değişiklik gerekmiyor"})}return {insert,update,skip}}
function findExistingMatch(candidate,existing,byPath){const pathMatch=byPath.get(normalizePath(candidate.local_source_path));if(pathMatch)return pathMatch;const candidateName=normalizeName(candidate.name),candidateCompact=candidateName.replaceAll(" ",""),aliases=LEGACY_NAME_ALIASES.get(candidateName)||[],matches=existing.filter(item=>{if(item.project_group!==candidate.project_group)return false;const current=normalizeName(item.name),currentCompact=current.replaceAll(" ","");return current===candidateName||currentCompact===candidateCompact||aliases.includes(current)});if(matches.length!==1)return null;const match=matches[0];return isEmpty(match.category)||match.category===candidate.category?match:null}

function mapClassification(projectRoot){const parts=portableRelative(projectRoot).split("/"),top=normalizeName(parts[0]);let group="portfolio",status="fikir",category=null;if(top===normalizeName("MÜSTERİ DOSYALARI")){group="customer_project";status=parts.some(part=>normalizeName(part).includes("tamamlanan"))?"tamamlandi":parts.some(part=>normalizeName(part).includes("bekleyen"))?"beklemede":"fikir"}else if(top===normalizeName("ARŞİV"))status="arsiv";else if(top===normalizeName("DEVAM EDEN PROJELER"))status="gelistiriliyor";else if(top===normalizeName("TEST CALIŞMALARI"))status="test";else if(top!==normalizeName("PORTFÖY"))return {group,status,category};
  const normalizedPath=parts.map(normalizeName),archiveCategory=CATEGORIES[normalizedPath[1]];if(archiveCategory)category=archiveCategory;
  const pathText=normalizedPath.join("/");if(pathText.includes("pubg silah")||pathText.includes("teklif sozlesme"))category="application";else if(top===normalizeName("PORTFÖY")){if(normalizedPath[1]==="panel")category="panel";else if(pathText.includes("anlati/anlati app"))category="application";else category="website"}else if(top===normalizeName("MÜSTERİ DOSYALARI")){if(/schnappli admin/.test(pathText))category="panel";else if(/gelisimhub|\/schnappli$|kampus|kampuskitap/.test(pathText))category="application";else category="website"}else if(top===normalizeName("TEST CALIŞMALARI")){if(pathText.includes("url(foto url uretme)"))category="website"}
  return {group,status,category};
}

function canonicalProjectRoot(path){const parts=portableRelative(path).split("/"),top=normalizeName(parts[0]);if(top===normalizeName("ARŞİV")&&parts.length>=3)return join(INVENTORY_ROOT,...parts.slice(0,3));if(top===normalizeName("TEST CALIŞMALARI")||top===normalizeName("DEVAM EDEN PROJELER"))return parts.length>=2?join(INVENTORY_ROOT,...parts.slice(0,2)):null;if(top===normalizeName("PORTFÖY")){if(normalizeName(parts[1])==="anlati"&&normalizeName(parts[2]||"")==="anlati app")return join(INVENTORY_ROOT,...parts.slice(0,3));if(normalizeName(parts[1])==="panel"){const length=normalizeName(parts[2]||"")==="santiye(panel)"?4:3;return parts.length>=length?join(INVENTORY_ROOT,...parts.slice(0,length)):null}return parts.length>=2?join(INVENTORY_ROOT,...parts.slice(0,2)):null}return path}
function findLikelyProjectDirectories(){const result=[];walk(INVENTORY_ROOT,path=>{if(hasProjectMarker(path)&&!isExcluded(path))result.push(canonicalProjectRoot(path)||path)},{directories:true});return uniqueBy(result,path=>normalizePath(logicalPath(path)))}
function hasProjectMarker(path){return ["package.json","pubspec.yaml","requirements.txt","pyproject.toml","composer.json","Cargo.toml","go.mod","index.html"].some(file=>existsSync(join(path,file)))}
function isExplicitReadmeProject(path){return normalizePath(portableRelative(path)).endsWith("test calismalari/url(foto-url-uretme)/readme.md")}
function detectTechnologies(root,readme){const found=new Set(),text=readme.toLowerCase();const mappings=[["next.js",/next\.?js/],["React",/\breact\b/],["TypeScript",/typescript/],["Supabase",/supabase/],["Flutter",/flutter/],["Dart",/\bdart\b/],["React Native",/react native|expo/],["Tailwind CSS",/tailwind/],["Python",/python|django|flask|fastapi/],["Prisma",/prisma/],["Vite",/\bvite\b/]];for(const [label,pattern] of mappings)if(pattern.test(text))found.add(label);for(const manifest of findFiles(root,new Set(["package.json","pubspec.yaml","requirements.txt"]),3)){const content=readFileSync(manifest,"utf8").toLowerCase();for(const [label,pattern] of mappings)if(pattern.test(content))found.add(label)}return [...found]}
function readHeading(readme){return readme.match(/^#\s+(.+)$/m)?.[1]?.replace(/[*_`]/g,"").trim().slice(0,160)||null}
function isUsefulHeading(value){return Boolean(value&&value.length>=3&&!/^(or|readme|get(?:ting)? started|overview|documentation)$/i.test(value.trim()))}
function readShortDescription(readme,name){const blocks=readme.replace(/^#.*$/gm,"").split(/\r?\n\s*\r?\n/).map(value=>value.replace(/^[>*#\-\s]+/gm," ").replace(/\s+/g," ").trim()).filter(value=>value.length>20&&!value.startsWith("```")&&!/^https?:/i.test(value));return (blocks[0]||`${name} projesi`).slice(0,240)}
function hasSecretLikeContent(content){return /(?:service[_ -]?role|api[_ -]?key|password|secret|token)\s*[:=]\s*[^\s<{[]/i.test(content)||/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content)}
function readGitRemote(path){try{const value=execFileSync("git",["-C",path,"config","--get","remote.origin.url"],{encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();return /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\.git)?$/i.test(value)?value:null}catch{return null}}
function readGitBranch(path){try{return execFileSync("git",["-C",path,"branch","--show-current"],{encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim()||null}catch{return null}}

async function syncTechnologies(api,candidates,projects){let technologies=await api.select("technologies","select=id,name");const links=await api.select("project_technologies","select=project_id,technology_id");for(const candidate of candidates){const project=projects.find(item=>normalizePath(item.local_source_path)===normalizePath(candidate.local_source_path))||projects.find(item=>normalizeName(item.name)===normalizeName(candidate.name)&&item.project_group===candidate.project_group&&item.category===candidate.category);if(!project)continue;for(const name of candidate.technologies){let technology=technologies.find(item=>normalizeName(item.name)===normalizeName(name));if(!technology){technology=await api.insertReturning("technologies",{name});technologies=[...technologies,technology]}if(!links.some(link=>link.project_id===project.id&&link.technology_id===technology.id)){await api.insertIgnore("project_technologies",{project_id:project.id,technology_id:technology.id});links.push({project_id:project.id,technology_id:technology.id})}}}}
async function signIn(){const email=process.env.PROJECT_IMPORT_EMAIL,password=process.env.PROJECT_IMPORT_PASSWORD;if(!email||!password)fail("Dry-run için kullanıcı oturumu gerekli. PROJECT_IMPORT_EMAIL ve PROJECT_IMPORT_PASSWORD ortam değişkenlerini yalnızca geçici terminal oturumunda tanımlayın; dosyaya veya komut geçmişine yazmayın.");const response=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:"POST",headers:{apikey:SUPABASE_ANON_KEY,"Content-Type":"application/json"},body:JSON.stringify({email,password})});if(!response.ok)fail(`Supabase oturumu açılamadı (${response.status}).`);return response.json()}
function loadDotEnv(path){if(!existsSync(path))return;for(const line of readFileSync(path,"utf8").split(/\r?\n/)){const match=line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);if(match&&!process.env[match[1]])process.env[match[1]]=match[2].replace(/^['"]|['"]$/g,"")}}
function walk(root,onEntry,options={}){for(const entry of readdirSync(root,{withFileTypes:true})){if(EXCLUDED.has(entry.name)||entry.name.startsWith(".env"))continue;const path=join(root,entry.name);if(entry.isDirectory()){if(options.directories)onEntry(path);walk(path,onEntry,options)}else if(!options.directories)onEntry(path)}}
function findFiles(root,names,maxDepth,depth=0,result=[]){if(depth>maxDepth)return result;for(const entry of readdirSync(root,{withFileTypes:true})){if(EXCLUDED.has(entry.name)||entry.name.startsWith(".env"))continue;const path=join(root,entry.name);if(entry.isDirectory())findFiles(path,names,maxDepth,depth+1,result);else if(names.has(entry.name))result.push(path)}return result}
function logicalPath(path){return `${ROOT_LABEL}/${portableRelative(path)}`}
function portableRelative(path){return relative(INVENTORY_ROOT,path).split(sep).join("/")}
function normalizePath(value){return String(value||"").replaceAll("\\","/").replace(/\s*\/\s*/g,"/").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("tr-TR").replace(/ı/g,"i")}
function normalizeName(value){return String(value||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("tr-TR").replace(/ı/g,"i").replace(/[^a-z0-9()]+/g," ").trim()}
function displayName(path){return last(path).replace(/[-_]+/g," ").replace(/\s+/g," ").trim()}
function last(path){return path.split(sep).at(-1)}function pathDepth(path){return portableRelative(path).split("/").length}
function isExcluded(path){return path.split(sep).some(part=>EXCLUDED.has(part)||part.startsWith(".env"))}
function isEmpty(value){return value===null||value===undefined||value===""||(Array.isArray(value)&&!value.length)}
function without(value,keys){return Object.fromEntries(Object.entries(value).filter(([key])=>!keys.includes(key)))}
function uniqueBy(items,key){return [...new Map(items.map(item=>[key(item),item])).values()]}
function printSummary(report,path){console.log(`\n${report.mode.toUpperCase()} RAPORU`);console.log(`Eklenecek: ${report.counts.insert}`);console.log(`Güncellenecek: ${report.counts.update}`);console.log(`Atlanacak: ${report.counts.skip}`);console.log(`Manuel/belirsiz: ${report.counts.manual}`);console.log(`Rapor: ${relative(WORKSPACE,path)}`);console.log(`Yedek: ${report.backup}`);for(const key of ["insert","update","skip","manual"]){console.log(`\n[${key.toUpperCase()}]`);for(const item of report[key])console.log(`- ${item.name||item.path} | ${item.path||item.reason}${item.fields?` | ${item.fields.join(", ")}`:""}`)}}
function fail(message){console.error(`\nGÜVENLİ DURDURMA: ${message}`);process.exit(1)}
