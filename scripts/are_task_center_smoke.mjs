#!/usr/bin/env node
// Owner-authorized private synthetic pilot. Never print or persist raw Task/Owner tokens in Git.
// Run: node scripts/are_task_center_smoke.mjs create|verify|revoke
import {readFileSync,writeFileSync,unlinkSync,existsSync,chmodSync} from "node:fs";
import {homedir} from "node:os";
import {join} from "node:path";
import assert from "node:assert/strict";
const directory=join(homedir(),".config/are-private-intake");
const keys=JSON.parse(readFileSync(join(directory,"credentials.v1.json"),"utf8"));
const qaPath=join(directory,"qa-task-center-20261120.json");
const url="https://br-raspy-hat-b96bluqn-areintake.compute.c-7.eu-central-1.aws.neon.tech";
const packagePath="/tmp/are-colleague-pilot-results-20261120/agent-connectors-mcp.package.json";
async function call(route,secret,body){
 const response=await fetch(url+route,{method:"POST",redirect:"error",cache:"no-store",
  headers:{"Content-Type":"application/json","Accept":"application/json",Authorization:"Bearer "+secret},
  body:JSON.stringify(body),signal:AbortSignal.timeout(16000)});
 const data=await response.json().catch(()=>({error:"unparseable_reply"}));
 return {http:response.status,...data};
}
const action=process.argv[2];
if(!["create","verify","revoke"].includes(action))throw Error("Specify create, verify or revoke");
if(action==="create"){
 assert(!existsSync(qaPath),"QA task already exists; don't create another");
 const r=await call("/v1/tasks/create",keys.owner_token,{
   repository_key:"janijegoroff/agent-connectors-mcp",
   title:"QA / ARE Task MCP-to-Neon pipeline",
   assignee_id:"colleague-pilot",assessor_organization:"ARE Research",
   instructions:"Synthetic task to verify private MCP reads and submissions; no third-party writes or public release.",
   expires_days:1
 });
 assert.equal(r.http,200,JSON.stringify({http:r.http,error:r.error}));
 assert.match(r.task_token,/^aret_[a-zA-Z0-9_-]{43}$/);
 writeFileSync(qaPath,JSON.stringify({task_id:r.task.id,task_token:r.task_token}),{flag:"wx",mode:0o600});
 chmodSync(qaPath,0o600);
 console.log("TASK_CREATED",r.task.id,"token_only_in_owner_private_file");
}else if(action==="verify"){
 const qa=JSON.parse(readFileSync(qaPath,"utf8")),token=qa.task_token;
 const task=await call("/v1/task/read",token,{});
 assert.equal(task.http,200,JSON.stringify(task));
 assert.equal(task.task.repository_key,"janijegoroff/agent-connectors-mcp");
 console.log("TASK_READ_OK",qa.task_id);
 for(const offset of [0,8,16,24]){
  const criteria=await call("/v1/task/criteria",token,{offset});
  assert.equal(criteria.http,200,JSON.stringify(criteria).slice(0,200));
  assert.equal(criteria.criteria.length,8);
 }
 console.log("32_CRITERIA_PAGED_OK");
 const pack=JSON.parse(readFileSync(packagePath,"utf8"));
 const wrong={...pack,repository_key:"cooyun/etuki-gate"};
 const declined=await call("/v1/task/submit",token,wrong);
 assert.equal(declined.http,400,"must reject another repository");
 console.log("CROSS_PROJECT_DENIED");
 const first=await call("/v1/task/submit",token,pack);
 assert.equal(first.http,200,JSON.stringify(first));
 assert.equal(first.private,true);
 assert.equal(first.public_release_authorized,false);
 console.log("TASK_SUBMITTED_PRIVATE",first.submission_id,first.stage);
 const duplicate=await call("/v1/task/submit",token,pack);
 assert.equal(duplicate.http,200,JSON.stringify(duplicate));
 assert.equal(duplicate.submission_id,first.submission_id);
 console.log("TASK_IDEMPOTENCY_PASS");
 const receipt=await call("/v1/task/receipt",token,{submission_id:first.submission_id});
 assert.equal(receipt.http,200,JSON.stringify(receipt));
 assert.equal(receipt.receipt.id,first.submission_id);
 console.log("TASK_NEON_RECEIPT_PASS");
}else{
 const qa=JSON.parse(readFileSync(qaPath,"utf8")),token=qa.task_token;
 const revoked=await call("/v1/tasks/revoke",keys.owner_token,{id:qa.task_id});
 assert.equal(revoked.http,200,JSON.stringify(revoked));
 assert.equal(revoked.revoked,true);
 for(const endpoint of ["/v1/task/read","/v1/task/receipt"]){
  const forbidden=await call(endpoint,token,{});
  assert.equal(forbidden.http,403,JSON.stringify(forbidden));
 }
 const pack=JSON.parse(readFileSync(packagePath,"utf8"));
 const blocked=await call("/v1/task/submit",token,pack);
 assert.equal(blocked.http,403);
 unlinkSync(qaPath);
 console.log("TASK_REVOKED_ALL_OPERATIONS_DENIED_TEMP_SECRET_REMOVED");
}
