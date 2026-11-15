// Local evidence-quality gate. Never executes project code, publishes data or certifies ARE levels.
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadChecks } from "./data.js";
import { KnowledgeError } from "./knowledge.js";
import type { Workspace } from "./workspace.js";
import {semanticReview, applicabilityReview, riskyRecommendations, lightweightEquivalent, coverageReview, authorizationReview} from "./audit-semantics.js";

type Severity = "blocker" | "review";
type Issue = { code:string; severity:Severity; check?:string; message:string; hint:string };
const ids = new Set(loadChecks().map(x=>x.id));
const accepted = new Set(["VERIFIED_PASS","VERIFIED_FAIL","UNKNOWN","NOT_APPLICABLE"]);
const ext = "(?:mdc|js|mjs|cjs|ts|tsx|jsx|py|md|json|jsonl|yaml|yml|toml|sql|txt|log|sh|html|xml)";
const fileRe = new RegExp(
  "file:\\/\\/\\/[^\\s\\])>]+|(?<![A-Za-z0-9_])(?:\\.\\.\\/|\\.\\/)?(?:[A-Za-z0-9_.-]+\\/)*[A-Za-z0-9_.-]+\\."+ext+"(?:#L?\\d+(?:-L?\\d+)?)?(?![A-Za-z0-9_.])",
  "g"
);

const artifact:Record<string,{label:string;re:RegExp}>={
 "L1-V1":{label:"reviewed ARE-T01 value card with Owner decision",re:/ARE-T01|value.card|价值卡/i},
 "L1-V2":{label:"ARE-T01 baseline source and measurement plan",re:/ARE-T01|value.card|价值卡/i},
 "L1-V3":{label:"minimum validation record in ARE-T01",re:/ARE-T01|value.card|价值卡|eval.*report|validation.record/i},
 "L1-V4":{label:"ARE-T02 capability matrix with explicit first-batch cap",re:/ARE-T02|capability.matrix|能力矩阵/i},
 "L1-A1":{label:"ARE-T02 matrix with Owner/approver/responsible",re:/ARE-T02|capability.matrix|能力矩阵/i},
 "L1-C1":{label:"catch-all inventory in ARE-T02 matrix",re:/ARE-T02|capability.matrix|能力矩阵/i},
 "L3-A1":{label:"approved authorization matrix",re:/ARE-T04|authorization.matrix|授权矩阵|approval.record/i},
 "L3-S2":{label:"draft expiry, isolation and cleanup evidence",re:/draft|草稿|operation.contract|ARE-T03/i},
 "L4-O2":{label:"actual release-blocking CI gate configuration",re:/\.github\/workflows\/|release.gate|ci\.yml|ci\.yaml|codebuild|pipeline/i},
 "L4-R2":{label:"completed value review written back into Value Card",re:/ARE-T01|value.review|价值复盘/i}
};
function flag(code:string,severity:Severity,message:string,hint:string,check?:string):Issue {
 return {code,severity,...(check?{check}:{}),message,hint};
}
function extractRows(text:string){
 const rows:{id:string;state:string;type:string;evidence:string;line:number}[]=[];
 text.split(/\r?\n/).forEach((line,i)=>{
  const m=/^\|\s*\*{0,2}(L[1-4]-[A-Z]\d+)\*{0,2}\s*\|(.+)\|\s*$/.exec(line);
  if(!m)return;
  const cells=m[2]!.split("|").map(s=>s.trim());
  const state=(cells[1]||"").replace(/\*\*/g,"");
  if(accepted.has(state))rows.push({id:m[1]!,state,type:(cells[2]||"").replace(/[\x60*]/g,""),
   evidence:cells.slice(3).join("|"),line:i+1});
 });
 return rows;
}
function inspectRef(ws:Workspace,reference:string){
 const ref=reference.replace(/[),;]+$/,"");
 const path=ref.replace(/#L.*$/,"");
 let absolute:string;
 try{
  absolute=ws.resolve(path.startsWith("file://")?fileURLToPath(new URL(path)):path,"file");
 }catch(e){
  return e instanceof KnowledgeError&&e.code==="path_outside_workspace"?"outside_workspace":"missing_file";
 }
 const m=/#L?(\d+)(?:-L?(\d+))?/.exec(ref);
 if(!m)return "file_exists";
 const lines=readFileSync(absolute,"utf8").split(/\r?\n/).length;
 const start=Number(m[1]),end=Number(m[2]||m[1]);
 return start>=1&&end>=start&&end<=lines?"line_exists":"invalid_line_range";
}
/** Read the cited range only; never return source text in results. */
function citedExcerpt(ws:Workspace,ref:string):string {
  try{
    const cleaned=ref.replace(/[),;]+$/,"");
    const filePart=cleaned.replace(/#L.*$/,"");
    const absolute=ws.resolve(filePart.startsWith("file://")?fileURLToPath(new URL(filePart)):filePart,"file");
    const fileText=readFileSync(absolute,"utf8");
    if(Buffer.byteLength(fileText)>1_000_000)return "";
    const m=/#L?(\d+)(?:-L?(\d+))?/.exec(cleaned);
    if(!m)return fileText.slice(0,5000);
    const lines=fileText.split(/\r?\n/);
    const first=Math.max(0,Number(m[1])-1),last=Math.min(lines.length,Number(m[2]||m[1])+2);
    return lines.slice(first,last).join("\n").slice(0,6000);
  }catch{return "";}
}
export function validateLocalMcpAudit(ws:Workspace,path:string){
 const resolved=ws.resolve(path,"file");
 if(!basename(resolved).endsWith(".md"))throw new KnowledgeError("invalid_audit_report","Expected a Markdown audit report.");
 const report=ws.read(resolved);
 if(Buffer.byteLength(report)>150000)throw new KnowledgeError("audit_report_too_large","Maximum report size is 150KB.");
 const rows=extractRows(report),issues:Issue[]=[];
 const counts=new Map<string,number>();
 for(const row of rows)counts.set(row.id,(counts.get(row.id)||0)+1);
 for(const id of ids)if(!counts.has(id))issues.push(flag("missing_check","blocker",id+" is absent.","Include all 39 official checks.",id));
 for(const [id,count] of counts)if(count>1)issues.push(flag("duplicate_check","blocker",id+" appears "+count+" times.","Keep one result per check.",id));
 let passes=0,sourceRefs=0,invalidRefs=0,notApplicable=0;
 for(const row of rows){
  if(!ids.has(row.id)){issues.push(flag("unknown_check","blocker",row.id+" is not an ARE check.","Use canonical ARE-A02 IDs.",row.id));continue;}
  if(row.state==="NOT_APPLICABLE"){
   notApplicable++;
   issues.push(...applicabilityReview(row,report));
   issues.push(flag("na_needs_human_review","review",row.id+" applicability needs an explicit confirmed rationale.","Provide scenario-specific reason and human reviewer.",row.id));
   continue;
  }
  if(row.state!=="VERIFIED_PASS")continue;
  passes++;
  if(!["inspected","documented"].includes(row.type))
   issues.push(flag("evidence_type_missing","blocker",row.id+" lacks inspected/documented evidence.","Use valid evidence type and supporting artifact.",row.id));
  const refs=[...new Set([...row.evidence.matchAll(fileRe)].map(x=>x[0]||""))].slice(0,20);
  if(!refs.length)issues.push(flag("missing_source_reference","blocker",row.id+" PASS has no source file.","Cite file and line or test log.",row.id));
  const excerpts:string[]=[];
  for(const ref of refs){
   sourceRefs++;const status=inspectRef(ws,ref);
   if(status==="file_exists"||status==="line_exists"){excerpts.push(citedExcerpt(ws,ref));continue;}
   invalidRefs++;
   issues.push(flag(status,"blocker",row.id+" citation does not resolve: "+status+".","Correct path or line within authorized workspace.",row.id));
  }
  const citationText=excerpts.join("\n").slice(0,18_000);
  issues.push(...semanticReview(row,citationText));
  const expected=artifact[row.id];
  if(expected&&!expected.re.test(row.evidence)){
   if(lightweightEquivalent(row,citationText)){
     issues.push(flag("lightweight_equivalent_needs_review","review",row.id+": compact documentation may satisfy the ARE requirement but still needs reviewer approval.",
       "Verify the Owner decision, scope and underlying evidence rather than requiring a corporate-style filename.",row.id));
   }else{
     issues.push(flag("evidence_semantic_mismatch","blocker",row.id+": cited artifact does not establish the required ARE deliverable.",
       "Supply "+expected.label+" or an equivalent compact record with the same substantive fields.",row.id));
   }
  }
  issues.push(...coverageReview(row,citationText));
  issues.push(...authorizationReview(row,citationText));
 }
 issues.push(...riskyRecommendations(report));
 let head:string|null=null;
 try{head=execFileSync("git",["-C",ws.root,"rev-parse","HEAD"],{encoding:"utf8",timeout:1200,stdio:["ignore","pipe","ignore"]}).trim();}catch{}
 const reportCommit=report.slice(0,2000).match(/\b[a-f0-9]{40}\b/i)?.[0]||null;
 if(!reportCommit)issues.push(flag("unpinned_source","review","No 40-char Git commit recorded.","Pin exact source and running binary versions."));
 else if(head&&head!==reportCommit)issues.push(flag("commit_mismatch","review","Checked-out HEAD is not the report's pinned commit.","Retest changed checks or use pinned worktree."));
 const blockerCount=issues.filter(x=>x.severity==="blocker").length;
 return {schema:"are.local-audit-evidence-gate.v2",mode:"local_only_no_upload",file:ws.rel(resolved),
  official_run_id:null,official_score:null,maturity_certified:false,
  verdict:blockerCount?"REVIEW_REQUIRED":"STRUCTURALLY_REVIEWABLE_NOT_CERTIFIED",
  claimed:{pass:passes,not_applicable:notApplicable,checks:rows.length},
  evidence:{references_checked:sourceRefs,invalid_references:invalidRefs},
  issue_count:issues.length,blocker_count:blockerCount,issues:issues.slice(0,150),
  limitation:"Local static gate verifies citations, explicit coverage claims and selected semantic elements; keyword/range matches are not proof of runtime behavior, full scope, human approval or ARE L0-L4 certification."};
}
