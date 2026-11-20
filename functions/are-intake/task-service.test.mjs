import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {makeHandler,PRODUCT_CHECKS} from "./index.mjs";
import {TASK_CRITERIA} from "./criteria-compact.mjs";
import {TASK_CREATE_SQL,TASK_READ_SQL,TASK_REVOKE_SQL,TASK_LIST_SQL,TASK_RECEIPT_SQL,
  TASK_CANDIDATES_SQL,TASK_SUBMIT_SQL,tokenHash,validateTaskCreate} from "./task-service.mjs";
const sha=x=>createHash("sha256").update(x).digest("hex");
const ownerToken="ario_"+("b".repeat(64)),reviewerToken="arip_"+("a".repeat(64));
const env={ARE_INTAKE_OWNER_HASH:sha(ownerToken),
 ARE_INTAKE_REVIEWERS_JSON:JSON.stringify({"colleague-pilot":sha(reviewerToken)})};
const REPO="janijegoroff/agent-connectors-mcp";
const TASK_ID="11111111-2222-4333-8444-555555555555";
const revision="cfac1539bdc273c5169e44528ac1b11ef4eb3823";
const task={
 id:TASK_ID,cohort_id:"ARE100-VALUE-20261115",repository_key:REPO,
 title:"Agent Connectors source and runtime audit",instructions:"Read-only safe tests",
 assignee_id:"colleague-01",assessor_organization:"ARE Research",
 expires_at:"2026-12-01T00:00:00Z",created_at:"2026-11-20T00:00:00Z"
};
const taskToken="aret_"+("Z".repeat(43));
const req=(path,token,body,method=body===undefined?"GET":"POST")=>new Request("https://are-internal.test"+path,{
 method,headers:{...(token?{Authorization:"Bearer "+token}:{}),"Content-Type":"application/json"},
 ...(body!==undefined?{body:JSON.stringify(body)}:{})
});
const packageFor=(repo=REPO,assignee="colleague-01",org="ARE Research")=>({
 cohort_id:"ARE100-VALUE-20261115",repository_key:repo,summary:"Source review with no runtime test claimed",
 recommendations:[],
 source_binding:{verified:false},
 report:{schema:"are.assessment.result.v1",mode:"ARE_INDEPENDENT",track:"product",
 criteria_version:"pilot-2026-11-18",maturity_level:null,certification:false,public_release_authorized:false,
 target:{id:repo,source_revision:revision,observed_version:revision,owner_organization:"janijegoroff",endpoint:""},
 assessor:{id:assignee,organization:org},
 findings:PRODUCT_CHECKS.map(id=>({check_id:id,status:"NOT_TESTED",evaluator_mode:"ARE_INDEPENDENT",
  evidence_class:"ASSESSOR_DECLARED_PROVENANCE_NOT_EXTERNALLY_ATTESTED"}))},
 agent_tasks:[],contact_route:{url:"https://github.com/"+repo}
});
function dbSimulation(){
 const events=[];let activeToken=null,revoked=false;
 const sql=async (query,params=[])=>{
  events.push({query,params});
  if(query===TASK_CREATE_SQL){activeToken=params[6];revoked=false;return task;}
  if(query===TASK_LIST_SQL)return {tasks:[{...task,submissions:0,revoked_at:revoked?"2026-11-20T11:00:00Z":null}]};
  if(query===TASK_CANDIDATES_SQL)return {candidates:[{repository_key:REPO,display_name:"Agent Connectors"}]};
  if(query===TASK_READ_SQL)return params[0]===activeToken&&!revoked?task:null;
  if(query===TASK_REVOKE_SQL){revoked=true;return {id:TASK_ID,repository_key:REPO,revoked_at:"2026-11-20T11:00:00Z"};}
  if(query===TASK_SUBMIT_SQL)return {id:"aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",state:"NEEDS_EVIDENCE",repository_key:REPO};
  if(query===TASK_RECEIPT_SQL)return {id:"aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",state:"NEEDS_EVIDENCE",repository_key:REPO};
  throw Error("Unexpected SQL");
 };
 return {sql,events};
}
async function data(res){return res.json();}
test("Owner task center shell never embeds private project/token",async()=>{
 const handle=makeHandler({env,sql:async()=>{throw Error("no DB query for static shell")}});
 const res=await handle(req("/v1/tasks/board"));
 assert.equal(res.status,200);
 assert.equal(res.headers.get("cache-control"),"no-store");
 const html=await res.text();
 assert.match(html,/ARE · 任务分配中心/);
 assert.match(html,/创建任务并生成提示词/);
 assert.doesNotMatch(html,/cfac1539bdc273c5169e44528ac1b11ef4eb3823/);
 const ownerPage=await handle(req("/v1/owner"));
 assert.equal(ownerPage.status,200);
 assert.match(await ownerPage.text(),/私有评测与联系清单/);
});
test("Unauthorized user/reviewer cannot create/list/revoke tasks or access inbox",async()=>{
 const db=dbSimulation(),handle=makeHandler({sql:db.sql,env});
 for(const secret of [undefined,reviewerToken,taskToken]){
  assert.equal((await handle(req("/v1/tasks",secret))).status,401);
  assert.equal((await handle(req("/v1/tasks/create",secret,{repository_key:REPO,title:"Audit",assignee_id:"colleague-01",assessor_organization:"ARE Research",instructions:"",expires_days:7}))).status,401);
  assert.equal((await handle(req("/v1/tasks/revoke",secret,{id:TASK_ID}))).status,401);
  assert.equal((await handle(req("/v1/inbox",secret))).status,401);
 }
 assert.equal(db.events.length,0);
});
test("Task creation produces a unique task-only Token and persists only digest",async()=>{
 const db=dbSimulation(),handle=makeHandler({sql:db.sql,env});
 const input={repository_key:REPO,title:"Audit",assignee_id:"colleague-01",assessor_organization:"ARE Research",instructions:"Please read",expires_days:7};
 const res=await handle(req("/v1/tasks/create",ownerToken,input));
 assert.equal(res.status,200);
 const created=await data(res);
 assert.match(created.task_token,/^aret_[a-zA-Z0-9_-]{43}$/);
 assert.equal(created.task.id,TASK_ID);
 assert.equal(created.public_release_authorized,false);
 const stored=db.events.find(x=>x.query===TASK_CREATE_SQL).params;
 assert.equal(stored[6],tokenHash(created.task_token));
 assert.ok(!JSON.stringify(stored).includes(created.task_token));
 const list=await data(await handle(req("/v1/tasks",ownerToken)));
 assert.equal(list.tasks.length,1);
 assert.ok(!JSON.stringify(list).includes(created.task_token));
 const candidates=await data(await handle(req("/v1/tasks/candidates",ownerToken)));
 assert.equal(candidates.candidates[0].repository_key,REPO);
});
test("Task scope, expiry validation and rejection of unsupported inputs",()=>{
 for(const expires_days of [0,15,1.5,-3])assert.throws(()=>validateTaskCreate({
 repository_key:REPO,title:"Audit",assignee_id:"colleague-01",assessor_organization:"ARE Research",instructions:"",expires_days
 }),/invalid_task_fields/);
 assert.throws(()=>validateTaskCreate({repository_key:"ssh://other",title:"Audit",assignee_id:"colleague-01",assessor_organization:"ARE Research",instructions:"",expires_days:7}),/invalid_task_fields/);
});
test("Task-specific token reads exact project, pages 32 criteria, no cross-task access",async()=>{
 const db=dbSimulation(),handle=makeHandler({sql:db.sql,env});
 const created=await data(await handle(req("/v1/tasks/create",ownerToken,
 {repository_key:REPO,title:"Audit",assignee_id:"colleague-01",assessor_organization:"ARE Research",instructions:"",expires_days:7})));
 const token=created.task_token;
 const res=await data(await handle(req("/v1/task/read",token,{})));
 assert.equal(res.task.repository_key,REPO);
 assert.equal(res.task_token_echoed,false);
 assert.equal(res.private,true);
 assert.equal(res.evidence_package_template.report.findings.length,32);
 assert.equal(res.evidence_package_template.report.assessor.id,"colleague-01");
 assert.equal(res.evidence_package_template.report.public_release_authorized,false);
 assert.ok(!JSON.stringify(res).includes(token));
 const observed=new Set();
 for(let i=0;i<4;i++){
  const page=await data(await handle(req("/v1/task/criteria",token,{offset:i*8})));
  assert.equal(page.criteria.length,8);
  for(const c of page.criteria){
   assert.ok(c.minimum_samples>=1);
   assert.ok(c.procedure);
   observed.add(c.id);
  }
 }
 assert.equal(observed.size,32);
 assert.equal((await handle(req("/v1/task/read","aret_"+("N".repeat(43)),{}))).status,403);
 assert.equal((await handle(req("/v1/task/criteria",token,{offset:101}))).status,400);
});
test("Agent can only submit correctly bound private evidence and read own receipt",async()=>{
 const db=dbSimulation(),handle=makeHandler({sql:db.sql,env,githubVerify:async()=>true});
 const created=await data(await handle(req("/v1/tasks/create",ownerToken,
 {repository_key:REPO,title:"Audit",assignee_id:"colleague-01",assessor_organization:"ARE Research",instructions:"",expires_days:7})));
 const token=created.task_token;
 assert.equal((await handle(req("/v1/task/submit",token,packageFor("cooyun/etuki-gate")))).status,400);
 assert.equal((await handle(req("/v1/task/submit",token,packageFor(REPO,"colleague-02")))).status,400);
 assert.equal((await handle(req("/v1/task/submit",token,packageFor(REPO,"colleague-01","Other Org")))).status,400);
 const valid=await handle(req("/v1/task/submit",token,packageFor()));
 assert.equal(valid.status,200);
 const receipt=await data(valid);
 assert.equal(receipt.private,true);
 assert.equal(receipt.public_release_authorized,false);
 assert.equal(receipt.task_id,TASK_ID);
 assert.match(receipt.content_sha256,/^[a-f0-9]{64}$/);
 const call=db.events.find(x=>x.query===TASK_SUBMIT_SQL);
 assert.ok(call);
 assert.equal(call.params[0],tokenHash(token));
 assert.equal(call.params[3],REPO);
 assert.equal(call.params[4],"colleague-01");
 assert.equal(call.params[8],"");
 assert.equal((await data(await handle(req("/v1/task/receipt",token,{})))).receipt.id,"aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee");
 assert.equal((await handle(req("/v1/task/publish",token,{public:true}))).status,404);
});
test("Owner revocation instantly rejects task reads, new submissions and receipts",async()=>{
 const db=dbSimulation(),handle=makeHandler({sql:db.sql,env,githubVerify:async()=>true});
 const created=await data(await handle(req("/v1/tasks/create",ownerToken,
 {repository_key:REPO,title:"Audit",assignee_id:"colleague-01",assessor_organization:"ARE Research",instructions:"",expires_days:7})));
 const token=created.task_token;
 const revoked=await data(await handle(req("/v1/tasks/revoke",ownerToken,{id:TASK_ID})));
 assert.equal(revoked.revoked,true);
 assert.equal((await handle(req("/v1/task/read",token,{}))).status,403);
 assert.equal((await handle(req("/v1/task/submit",token,packageFor()))).status,403);
 assert.equal((await handle(req("/v1/task/receipt",token,{}))).status,403);
});
test("Source commit must be verified before task submission writes",async()=>{
 const db=dbSimulation(),handle=makeHandler({sql:db.sql,env,githubVerify:async()=>false});
 const created=await data(await handle(req("/v1/tasks/create",ownerToken,
 {repository_key:REPO,title:"Audit",assignee_id:"colleague-01",assessor_organization:"ARE Research",instructions:"",expires_days:7})));
 assert.equal((await handle(req("/v1/task/submit",created.task_token,packageFor()))).status,422);
 assert.ok(!db.events.some(x=>x.query===TASK_SUBMIT_SQL));
});
