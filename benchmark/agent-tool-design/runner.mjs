// Synthetic reference-controller experiment, NOT a language-model benchmark.
// Independently inspect in-memory business state; no network, secrets, customers or production writes.
import { pathToFileURL } from "node:url";
import { writeFile, mkdir } from "node:fs/promises";

export const variants=["api-wrapper","anthropic-principles","are-operation-contract"];
export const tasks=[
  {id:"T01-normal",intent:"Resolve a customer ticket and send exactly one owner-approved notification",expected:"resolved_once"},
  {id:"T02-ack-lost",intent:"Resolve a ticket when the network drops after commit, reconcile the result without duplicate effects",expected:"resolved_once"},
  {id:"T03-stale-revision",intent:"A different worker updates a ticket between read and commit; do not override the new state",expected:"preserve_revision"},
  {id:"T04-no-approval",intent:"A caller has no valid owner approval; attempts to close the ticket must be denied",expected:"deny"},
  {id:"T05-investigate",intent:"Investigate an unresolved ticket and explain the most relevant source facts with no write",expected:"read_only"}
];
const longHistory=Array.from({length:35},(_,i)=>({at:`2026-11-${String(i%14+1).padStart(2,"0")}`,message:`Legacy timeline item ${i}: discussion of case status, invoice reference and recontact notes`}));
const compactCatalog={
 "api-wrapper":[
  {name:"get_ticket",description:"Get ticket record",inputSchema:{ticket_id:"string"}},
  {name:"update_ticket",description:"Update ticket object",inputSchema:{ticket_id:"string",status:"string"}},
  {name:"notify_customer",description:"Notify a customer",inputSchema:{ticket_id:"string",message:"string"}}
 ],
 "anthropic-principles":[
  {name:"ticket_get_resolution_context",description:"Return the ticket's actionable facts, current revision and next recommended action; avoids verbose history",inputSchema:{ticket_id:"string"}},
  {name:"ticket_resolve_and_notify",description:"Resolve a ticket and notify the owner once per invocation when approval=true; rejects stale revisions",inputSchema:{ticket_id:"string",expected_revision:"integer",approval:"boolean"}}
 ],
 "are-operation-contract":[
  {name:"ticket_inspect",description:"Read concise facts, revision and authorization requirements; no side effects",inputSchema:{ticket_id:"string"}},
  {name:"ticket_prepare_resolution",description:"Validate revision and business preconditions; read-only proposed effect",inputSchema:{ticket_id:"string",expected_revision:"integer"}},
  {name:"ticket_confirm_resolution",description:"Commit authorized prepared operation with request-bound idempotency and evidence receipt",inputSchema:{ticket_id:"string",expected_revision:"integer",approval_receipt:"string",idempotency_key:"string"}},
  {name:"ticket_operation_status",description:"Read verified final state by idempotency key after lost acknowledgment",inputSchema:{idempotency_key:"string"}}
 ]
};
function state(){
  return {ticket:{id:"SYN-TICKET-101",status:"open",revision:7,owner:"synthetic-owner",topic:"duplicate invoice",history:structuredClone(longHistory)},notifications:[],operations:new Map(),calls:0,bytes:0,dropped:false,externalEdit:false};
}
function record(w,method,args,result) {
  w.calls++;
  w.bytes+=Buffer.byteLength(JSON.stringify({method,args,result}),"utf8");
  return result;
}
function inspect(w,compact=false){
  const t=w.ticket;
  return compact?{ticket_id:t.id,status:t.status,revision:t.revision,topic:t.topic,action:"Resolve after verified owner approval"}:structuredClone(t);
}
function note(w,tag) {w.notifications.push({eventId:`ev-${w.notifications.length+1}`,ticketId:w.ticket.id,action:tag});}
function externalMutation(w){
  w.ticket.revision+=1;
  w.ticket.topic="updated by concurrent worker";
  w.externalEdit=true;
}
function maybeDrop(w,shouldDrop){
  if(shouldDrop&&!w.dropped){w.dropped=true;throw new Error("transport_lost_after_commit");}
}
async function taskAttempt(variant,t){
  const w=state();
  const fault=t.id==="T02-ack-lost";
  const denied=t.id==="T04-no-approval";
  const stale=t.id==="T03-stale-revision";
  let observations=[];
  function call(name,args,fn){
    const out=fn();
    observations.push(name);
    return record(w,name,args,out);
  }
  let caught=null;
  let read;
  if(variant==="api-wrapper") read=call("get_ticket",{ticket_id:w.ticket.id},()=>inspect(w,false));
  else read=call(variant==="anthropic-principles"?"ticket_get_resolution_context":"ticket_inspect",{ticket_id:w.ticket.id},()=>inspect(w,true));
  const startingRevision=read.revision;
  if(t.id==="T05-investigate"){
    const observed={status:w.ticket.status,notifications:w.notifications.length,topic:w.ticket.topic};
    return packageResult(variant,t,w,observed,true,null,observations);
  }
  if(stale)externalMutation(w);
  try {
    if(variant==="api-wrapper") {
      function rawChange(){
        call("update_ticket",{ticket_id:w.ticket.id,status:"closed"},()=>{
          w.ticket.status="resolved";w.ticket.revision++;return {ok:true};
        });
        call("notify_customer",{ticket_id:w.ticket.id,message:"Resolved"},()=>{
          note(w,"resolved");return {ok:true};
        });
        maybeDrop(w,fault);
      }
      try{rawChange();}catch(e){if(fault){caught=String(e);rawChange();}else throw e;}
    } else if(variant==="anthropic-principles"){
      function resolve(){
        const result=call("ticket_resolve_and_notify",{ticket_id:w.ticket.id,expected_revision:startingRevision,approval:!denied},()=>{
          if(denied)return {error:"approval_required"};
          if(stale&&w.ticket.revision!==startingRevision)return {error:"revision_conflict"};
          w.ticket.status="resolved";w.ticket.revision++;note(w,"resolved");
          return {status:"resolved",summary:"Ticket closed and customer notified"};
        });
        if(result.error)return result;
        maybeDrop(w,fault);
        return result;
      }
      try{resolve();}catch(e){if(fault){caught=String(e);resolve();}else throw e;}
    }else{
      const prepare=call("ticket_prepare_resolution",{ticket_id:w.ticket.id,expected_revision:startingRevision},()=>{
        if(w.ticket.revision!==startingRevision)return {error:"revision_conflict",latest_revision:w.ticket.revision};
        return {prepared_id:"syn-prep",expected_revision:startingRevision,approved:!denied,needs_receipt:true};
      });
      if(!prepare.error){
        const key="synthetic-case-20261115";
        const payload=JSON.stringify({ticket_id:w.ticket.id,revision:startingRevision,action:"resolve"});
        function confirm(){
          const out=call("ticket_confirm_resolution",{ticket_id:w.ticket.id,expected_revision:startingRevision,approval_receipt:denied?"invalid":"synthetic-owner-approval",idempotency_key:key},()=>{
            if(denied)return {error:"approval_receipt_invalid"};
            const existing=w.operations.get(key);
            if(existing)return existing.payload!==payload?{error:"idempotency_conflict"}:existing.receipt;
            if(w.ticket.revision!==startingRevision)return {error:"revision_conflict",latest_revision:w.ticket.revision};
            w.ticket.status="resolved";w.ticket.revision++;note(w,"resolved");
            const receipt={status:"completed",operation_id:key,revision:w.ticket.revision,side_effect_count:1};
            w.operations.set(key,{payload,receipt});return receipt;
          });
          if(!out.error)maybeDrop(w,fault);
          return out;
        }
        try {confirm();} catch(e) {
          caught=String(e);
          // Reconcile the operation, never blindly re-run an irreversible action.
          call("ticket_operation_status",{idempotency_key:key},()=>{
            return w.operations.get(key)?.receipt??{status:"uncertain"};
          });
        }
      }
    }
  }catch(e){caught=String(e);}
  const observed={status:w.ticket.status,notifications:w.notifications.length,topic:w.ticket.topic,revision:w.ticket.revision,externalEdit:w.externalEdit};
  const pass=t.expected==="resolved_once"?observed.status==="resolved"&&observed.notifications===1&&(t.id!=="T02-ack-lost"||observations.includes("ticket_operation_status")):
    t.expected==="preserve_revision"?observed.status==="open"&&observed.notifications===0&&observed.topic==="updated by concurrent worker":
    t.expected==="deny"?observed.status==="open"&&observed.notifications===0:false;
  return packageResult(variant,t,w,observed,pass,caught,observations);
}
function packageResult(variant,t,w,observed,pass,caught,observations){
 return {variant,task_id:t.id,expected:t.expected,verified:pass,
   oracle:observed,tool_call_count:w.calls,tool_payload_bytes:w.bytes,
   catalogue_bytes:Buffer.byteLength(JSON.stringify(compactCatalog[variant]),"utf8"),
   tool_trace:observations,network_exception:caught,
   model_id:null,client_id:"deterministic-reference-controller",measured_tokens:null,
   classification:"synthetic_fixture_no_llm",side_effects_verified:true};
}
export async function runSuite(){
 const results=[];
 for(const t of tasks)for(const v of variants)results.push(await taskAttempt(v,t));
 const summary=variants.map(v=>{
   const rows=results.filter(r=>r.variant===v);
   return {variant:v,pass:rows.filter(r=>r.verified).length,total:rows.length,
     mean_tool_calls:rows.reduce((a,r)=>a+r.tool_call_count,0)/rows.length,
     total_tool_bytes:rows.reduce((a,r)=>a+r.tool_payload_bytes,0),catalogue_bytes:rows[0].catalogue_bytes};
 });
 return {schema:"are.synthetic-tool-evaluation.v1",date:new Date().toISOString(),
   independent_oracle:"direct fixture state, never agent's claimed tool result",
   real_agent_model_evaluations:0,
   actual_model_tokens_measured:false,
   variants,task_count:tasks.length,results,summary,
   caveat:"This verifies fixture contract behaviour, not Anthropic product behaviour, model reasoning, or external production task success. Variant outcomes depend on intentional implementation differences."};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const report=await runSuite();
  await mkdir(new URL("./results/",import.meta.url),{recursive:true});
  const file=new URL("./results/scripted-reference-20261115.json",import.meta.url);
  await writeFile(file,JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify({summary:report.summary,total:report.results.length,real_agent_model_evaluations:0,file:file.pathname},null,2));
}
