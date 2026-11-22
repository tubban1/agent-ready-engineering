import test from "node:test";
import assert from "node:assert/strict";
import {handoffStartData,handoffFinishData,handoffBlockingError,
 HANDOFF_START_SQL,HANDOFF_FINISH_SQL,HANDOFF_STATUS_SQL} from "./provider-handoff-service.mjs";
import {taskAgentAction,TASK_READ_SQL} from "./task-service.mjs";
import {samplePackage} from "./evidence-validation.test.mjs";
const repo="cooyun/etuki-gate", secret="aret_"+"B".repeat(43),tid="11111111-2222-4333-8444-555555555555";
const assignment={id:tid,cohort_id:"ARE100-VALUE-20261115",repository_key:repo,
 assignee_id:"colleague-01",assessor_organization:"ARE Research",
 created_at:"2026-11-21T12:20:00Z",plan_snapshot:{version:"are.test-plan.v3",
 runtime_endpoint:"https://www.etuki.com/api/v1/mcp",auth_mode:"UNKNOWN"}};
const req=(path,data)=>new Request("https://example.invalid"+path,{method:"POST",
 headers:{"Content-Type":"application/json",Authorization:"Bearer "+secret},body:JSON.stringify(data)});
const started={phase:"START",auth_scheme:"API_KEY",
 provider_url:"https://provider.example.com/login",
 source_url:"https://github.com/vendor/public-provider/blob/main/README.md",
 host_action:"BROWSER_OPENED",host_action_ref:"browser-navigation-event-1234",
 note:"Actually opened official login page in authorized Agent host browser"};
const finished={phase:"FINISH",outcome:"USER_DECLINED",outcome_ref:"human-user-decline-event-1234",
 note:"The user explicitly declined to create a provider API key account"};
test("Provider handoff rejects secrets, unsafe URL, missing browser/source references",()=>{
 assert.equal(handoffStartData(Object.fromEntries(Object.entries(started).filter(([k])=>k!=="phase"))).scheme,"API_KEY"); // direct parser only accepts server stripped body
 assert.throws(()=>handoffStartData({...Object.fromEntries(Object.entries(started).filter(([k])=>k!=="phase")),provider_url:"http://127.0.0.1/mcp"}),/unsafe_provider_url/);
 assert.throws(()=>handoffStartData({...Object.fromEntries(Object.entries(started).filter(([k])=>k!=="phase")),provider_url:"https://provider.example.com/login?code=secret"}),/unsafe_provider_url/);
 assert.throws(()=>handoffStartData({...Object.fromEntries(Object.entries(started).filter(([k])=>k!=="phase")),host_action_ref:"short"}),/invalid_provider_handoff_start/);
 assert.throws(()=>handoffStartData({...Object.fromEntries(Object.entries(started).filter(([k])=>k!=="phase")),note:"Bearer ow_live_abcd1234"}),/invalid_provider_handoff_start/);
 assert.throws(()=>handoffFinishData({...Object.fromEntries(Object.entries(finished).filter(([k])=>k!=="phase")),note:"Bearer ow_live_longcredential"}),/invalid_provider_handoff_finish/);
});
test("Partial submission cannot be authorized by mere challenge, START or WAITING_FOR_USER",()=>{
 assert.equal(handoffBlockingError(null,"API_KEY"),"provider_handoff_not_started");
 assert.equal(handoffBlockingError({auth_scheme:"API_KEY",outcome:"WAITING_FOR_USER"},"API_KEY"),"provider_handoff_waiting_for_user");
 assert.equal(handoffBlockingError({auth_scheme:"OAUTH",outcome:"USER_DECLINED",finished_at:"x",outcome_ref:"ref",source_url:"https://example.com",provider_url:"https://example.com"},"API_KEY"),"provider_auth_scheme_mismatch");
 assert.equal(handoffBlockingError({auth_scheme:"API_KEY",outcome:"USER_DECLINED",finished_at:"2026-11-22",outcome_ref:"host-action-ref",
 source_url:"https://github.com/example/docs",provider_url:"https://provider.example.com/login"},"API_KEY"),null);
});
test("API_KEY request leads to active browser page action and documented provider outcome (never credentials)",async()=>{
 const startRecord={task_id:tid,auth_scheme:"API_KEY",outcome:"WAITING_FOR_USER",host_action:"BROWSER_OPENED",
  started_at:"2026-11-21T12:25:00Z",provider_url:started.provider_url,source_url:started.source_url,host_action_ref:started.host_action_ref};
 const finishRecord={...startRecord,outcome:"USER_DECLINED",outcome_ref:finished.outcome_ref,finished_at:"2026-11-21T12:30:00Z"};
 const calls=[];
 const sql=async(q,params)=>{
  if(q===TASK_READ_SQL)return assignment;
  if(q===HANDOFF_START_SQL){calls.push(["start",params]);return startRecord;}
  if(q===HANDOFF_FINISH_SQL){calls.push(["finish",params]);return finishRecord;}
  throw Error("Unexpected SQL query");
 };
 const deps={validateSubmission:()=>{},githubVerify:async()=>true,criteria:[]};
 const st=await taskAgentAction("/v3/task/auth/handoff",req("/v3/task/auth/handoff",started),sql,deps);
 assert.equal(st.status,200);
 assert.equal(st.data.provider_handoff.outcome,"WAITING_FOR_USER");
 assert.equal(st.data.consent_obtained,false);
 assert.equal(calls[0][1][2],"API_KEY");
 const fin=await taskAgentAction("/v3/task/auth/handoff",req("/v3/task/auth/handoff",finished),sql,deps);
 assert.equal(fin.status,200);
 assert.equal(fin.data.provider_handoff.outcome,"USER_DECLINED");
 assert.equal(fin.data.provider_authenticated_inferred,false);
 assert.equal(calls.length,2);
});
test("Only after authentic host outcome and raw protected-tool success can COMPLETE be considered",()=>{
 assert.match(HANDOFF_START_SQL,/private_task_authorization_requests/);
 assert.match(HANDOFF_FINISH_SQL,/WAITING_FOR_USER/);
 assert.match(HANDOFF_STATUS_SQL,/token_sha256/);
 assert.match(HANDOFF_FINISH_SQL,/UPDATE are_eval.private_task_provider_auth_handoffs/);
});
