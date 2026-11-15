// Local evidence-quality gate. Never executes project code, publishes data or certifies ARE levels.
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadChecks } from "./data.js";
import { KnowledgeError } from "./knowledge.js";
import type { Workspace } from "./workspace.js";

type Severity = "blocker" | "review";
type Issue = { code:string; severity:Severity; check?:string; message:string; hint:string };
const ids = new Set(loadChecks().map(x=>x.id));
const accepted = new Set(["VERIFIED_PASS","VERIFIED_FAIL","UNKNOWN","NOT_APPLICABLE"]);
const ext = "(?:js|mjs|cjs|ts|tsx|jsx|py|md|json|jsonl|yaml|yml|toml|sql|txt|log|sh|html|xml)";
const fileRe = new RegExp("file:\\/\\/\\/[^\\s\\])>]+|(?<![A-Za-z0-9_])(?:\\.\\.\\/|\\.\\/)?(?:[A-Za-z0-9_.-]+\\/)*[A-Za-z0-9_.-]+\\."+ext+"(?:#L?\\d+(?:-L?\\d+)?)?","g");
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
const breadth:Record<string,string>={
 "L2-X4":"all read-only tools and measured size per tool, not merely 3 samples",
 "L2-O2":"three representative end-to-end agent tasks and independent outcome verification",
 "L3-C1":"all first-batch writes with key scope/retention and replay tests",
 "L3-C2":"all mutable resources with expected_revision and conflict diff tests",
 "L3-C4":"every first-batch write operation contract and acceptance record",
 "L3-O2":"retry, revision conflict, disconnect, prompt injection, missing-input fault tests"
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
   issues.push(flag("na_needs_human_review","review",row.id+" applicability needs an explicit confirmed rationale.","Provide scenario-specific reason and human reviewer.",row.id));
   continue;
  }
  if(row.state!=="VERIFIED_PASS")continue;
  passes++;
  if(!["inspected","documented"].includes(row.type))
   issues.push(flag("evidence_type_missing","blocker",row.id+" lacks inspected/documented evidence.","Use valid evidence type and supporting artifact.",row.id));
  const refs=[...new Set([...row.evidence.matchAll(fileRe)].map(x=>x[0]||""))].slice(0,20);
  if(!refs.length)issues.push(flag("missing_source_reference","blocker",row.id+" PASS has no source file.","Cite file and line or test log.",row.id));
  for(const ref of refs){
   sourceRefs++;const status=inspectRef(ws,ref);
   if(status==="file_exists"||status==="line_exists")continue;
   invalidRefs++;
   issues.push(flag(status,"blocker",row.id+" citation does not resolve: "+status+".","Correct path or line within authorized workspace.",row.id));
  }
  const expected=artifact[row.id];
  if(expected&&!expected.re.test(row.evidence))
   issues.push(flag("evidence_semantic_mismatch","blocker",row.id+" citation is not the expected evidence artifact.",
    "Provide "+expected.label+" or independently review an equivalent artifact.",row.id));
  if(breadth[row.id])issues.push(flag("coverage_not_proven","blocker",row.id+" PASS lacks proof of coverage across its required scope.",
   "Provide numerator/denominator and reproducible result for "+breadth[row.id]+".",row.id));
  if(row.id==="L3-A2")issues.push(flag("authorization_semantics_unverified","blocker",
   "A written instruction not to self-confirm is not a server-side rejection test.",
   "Test actual refusal of agent-self-supplied authorization.",row.id));
 }
 const claimed=new Map(rows.map(r=>[r.id,r.state]));
 if(claimed.get("L2-X4")==="VERIFIED_PASS")
  issues.push(flag("limited_runtime_sample","review","Sampled tool sizes cannot prove every read-only tool was measured.","Add full tool inventory and per-tool response size."));
 if(/\b160,954\b/.test(report)&&/(?:48,000|4\.8\s*万).{0,18}Token/i.test(report))
  issues.push(flag("token_unmeasured","review","Bytes-to-token estimate is not measured Host token usage.","Keep estimate explicit; capture real Host usage for savings claims."));
 if(/(?:彻底删除|直接移除|建议移除|废弃工具|淘汰工具|\bremove\s+tool\b|\bretire\s+tool\b)/i.test(report))
  issues.push(flag("unsafe_tool_retirement","blocker","Retiring a tool may remove distinct semantics such as cancellation of in-progress tasks.","Prove task-level behavioral equivalence, including active cancellation, authorization and dependent integrations, before removal."));
 if(/所有.{0,30}工具.{0,100}readOnlyHint\s*:\s*true/s.test(report))
  issues.push(flag("bulk_readonly_annotation","blocker","Uniform read-only annotations may contradict local/cloud writes.","Classify real side effects per operation."));
 let head:string|null=null;
 try{head=execFileSync("git",["-C",ws.root,"rev-parse","HEAD"],{encoding:"utf8",timeout:1200,stdio:["ignore","pipe","ignore"]}).trim();}catch{}
 const reportCommit=report.slice(0,2000).match(/\b[a-f0-9]{40}\b/i)?.[0]||null;
 if(!reportCommit)issues.push(flag("unpinned_source","review","No 40-char Git commit recorded.","Pin exact source and running binary versions."));
 else if(head&&head!==reportCommit)issues.push(flag("commit_mismatch","review","Checked-out HEAD is not the report's pinned commit.","Retest changed checks or use pinned worktree."));
 const blockerCount=issues.filter(x=>x.severity==="blocker").length;
 return {schema:"are.local-audit-evidence-gate.v1",mode:"local_only_no_upload",file:ws.rel(resolved),
  official_run_id:null,official_score:null,maturity_certified:false,
  verdict:blockerCount?"REVIEW_REQUIRED":"STRUCTURALLY_REVIEWABLE_NOT_CERTIFIED",
  claimed:{pass:passes,not_applicable:notApplicable,checks:rows.length},
  evidence:{references_checked:sourceRefs,invalid_references:invalidRefs},
  issue_count:issues.length,blocker_count:blockerCount,issues:issues.slice(0,150),
  limitation:"Only verifies citation integrity and evidence coverage signals; never proves semantic correctness or issues ARE L0-L4 certification."};
}
