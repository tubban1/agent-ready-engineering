import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {PRODUCT_CHECKS,validateSubmission,makeHandler} from "./index.mjs";
const sha=x=>createHash("sha256").update(x).digest("hex");
const reviewerToken="arip_"+("a".repeat(64));
const ownerToken="ario_"+("b".repeat(64));
const env={ARE_INTAKE_REVIEWERS_JSON:JSON.stringify({"colleague-1":sha(reviewerToken)}),
 ARE_INTAKE_OWNER_HASH:sha(ownerToken)};
const revision="abcdef0123456789abcdef0123456789abcdef01";
function fixture(){
 return {cohort_id:"ARE100-VALUE-20261115",repository_key:"janijegoroff/agent-connectors-mcp",
  summary:"Source and tool contract reviewed; dynamic permissions remain unknown.",
  recommendations:["Add repeatable operation-level read-only tests."],
  source_binding:{verified:false},
  report:{schema:"are.assessment.result.v1",mode:"ARE_INDEPENDENT",track:"product",
   criteria_version:"pilot-2026-11-18",maturity_level:null,certification:false,
   public_release_authorized:false,
   target:{id:"janijegoroff/agent-connectors-mcp",source_revision:revision,
    observed_version:revision,owner_organization:"Test Author",endpoint:""},
   assessor:{id:"colleague-1",organization:"ARE Research"},
   findings:PRODUCT_CHECKS.map(check_id=>({check_id,status:"NOT_TESTED",
    evaluator_mode:"ARE_INDEPENDENT",
    evidence_class:"ASSESSOR_DECLARED_PROVENANCE_NOT_EXTERNALLY_ATTESTED"}))},
  agent_tasks:[],contact_route:{url:"https://github.com/janijegoroff/agent-connectors-mcp"}};
}
const req=(path,method="POST",data,token=reviewerToken,actor="colleague-1")=>
 new Request("https://areintake.example/"+path,{method,headers:{
 "Authorization": "Bearer "+token,"X-ARE-Reviewer":actor,"Content-Type":"application/json"},
 ...(data?{body:JSON.stringify(data)}:{})});
test("all 32 exact criteria required; private and non-certifying",()=>{
 const v=validateSubmission(fixture(),"colleague-1");
 assert.equal(v.stage,"NEEDS_EVIDENCE");
 assert.equal(v.decive_count,undefined);
 assert.equal(PRODUCT_CHECKS.length,32);
 assert.equal(v.verifiedTasks,0);
 const bad=fixture();bad.report.findings.pop();
 assert.throws(()=>validateSubmission(bad,"colleague-1"),/incomplete_criteria/);
});
test("independent actor/foreign org/source sha and publication boundary",()=>{
 const a=fixture();a.report.public_release_authorized=true;
 assert.throws(()=>validateSubmission(a,"colleague-1"),/unsupported_assessment/);
 const b=fixture();b.report.assessor.organization="Test Author";
 assert.throws(()=>validateSubmission(b,"colleague-1"),/reviewer_or_version_mismatch/);
 const c=fixture();c.report.target.source_revision="not-pinned";
 assert.throws(()=>validateSubmission(c,"colleague-1"),/reviewer_or_version_mismatch/);
 const d=fixture();d.report.findings[0].status="PASS";
 assert.throws(()=>validateSubmission(d,"colleague-1"),/decisive_missing_evidence/);
});
test("readiness only with source binding + real authorized oracle task + decisive finding",()=>{
 const x=fixture();x.report.findings[0].status="PASS";x.report.findings[0].evidence_id="source:src/index.ts#L1";
 x.agent_tasks=[{goal:"Inspect public health tool",agent:"test-agent",trace_ref:"trace-1",oracle_ref:"oracle-1",authorized:true,status:"PASS",oracle_verified:true}];
 assert.equal(validateSubmission(x,"colleague-1").stage,"NEEDS_EVIDENCE");
 x.source_binding={verified:true,evidence_ref:"github:README.md#MCP-register"};
 assert.equal(validateSubmission(x,"colleague-1").stage,"READY_FOR_OUTREACH");
});
test("nonexistent catalog, wrong token, no source SHA, and private owner-only queue",async()=>{
 const sqlCalls=[];const sql=async(query,params=[])=>{
   sqlCalls.push({query,params});
   if(query.includes("private_evaluation_runs("))return {id:"123",repository_key:"janijegoroff/agent-connectors-mcp",state:"NEEDS_EVIDENCE"};
   if(query.includes("json_build_object('runs'"))return {runs:[{repository_key:"janijegoroff/agent-connectors-mcp"}]};
   return null;
 };
 const h=makeHandler({sql,githubVerify:async()=>true,env});
 const unauthorized=await h(req("v1/submit","POST",fixture(),"invalid"));
 assert.equal(unauthorized.status,401);
 const wrong=await h(req("v1/submit","POST",fixture(),reviewerToken,"someone_else"));
 assert.equal(wrong.status,401);
 const good=await h(req("v1/submit","POST",fixture()));
 assert.equal(good.status,200);
 const json=await good.json();
 assert.equal(json.private,true);assert.equal(json.public_release_authorized,false);
 assert.equal(json.stage,"NEEDS_EVIDENCE");
 assert.equal(sqlCalls.length,1);
 const ownerMissing=await h(req("v1/inbox","GET",undefined,reviewerToken));
 assert.equal(ownerMissing.status,401);
 const ownerOk=await h(req("v1/inbox","GET",undefined,ownerToken));
 assert.equal(ownerOk.status,200);
 assert.equal((await ownerOk.json()).runs.length,1);
});
test("GitHub SHA truly verified before any SQL write",async()=>{
 let called=false;const h=makeHandler({env,githubVerify:async()=>false,sql:async()=>{called=true;}});
 const res=await h(req("v1/submit","POST",fixture()));
 assert.equal(res.status,422);assert.equal(called,false);
});
test("idempotency digest ignores JSON property order and changes upon evidence updates",()=>{
 const f=fixture(),s=validateSubmission(f,"colleague-1");
 assert.equal(s.submission_sha256,validateSubmission(JSON.parse(JSON.stringify(f)),"colleague-1").submission_sha256);
 f.recommendations.push("Add limits and error examples");
 assert.notEqual(s.submission_sha256,validateSubmission(f,"colleague-1").submission_sha256);
});
test("private owner page serves no data without token and has strict security headers",async()=>{
 const handler=makeHandler({env,sql:async()=>{throw Error("owner page must not query DB");}});
 const res=await handler(req("v1/owner","GET",undefined,"invalid"));
 assert.equal(res.status,200);
 const html=await res.text();
 assert.match(html,/<title>ARE · 私有评测与联系清单<\/title>/);
 assert.ok(!html.includes("janijegoroff/agent-connectors-mcp"));
 assert.match(html,/id="token"/);
 assert.match(res.headers.get("content-security-policy"),/frame-ancestors 'none'/);
 assert.equal(res.headers.get("cache-control"),"no-store");
});
test("owner can record contact events but cannot publish",async()=>{
 let called=0;const h=makeHandler({env,githubVerify:async()=>true,sql:async()=>{called++;return {id:2,event_type:"CONTACTED"};}});
 const r=await h(req("v1/contact","POST",{id:"12345678-1234-1234-1234-123456789abc",event_type:"CONTACTED",details:"Owner emailed project maintainer"},ownerToken));
 assert.equal(r.status,200);assert.equal(called,1);
 const evil=await h(req("v1/contact","POST",{id:"12345678-1234-1234-1234-123456789abc",event_type:"PUBLISHED",details:"x"},ownerToken));
 assert.equal(evil.status,400);assert.equal(called,1);
});
