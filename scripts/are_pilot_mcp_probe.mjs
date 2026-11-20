#!/usr/bin/env node
/**
 * Bounded public MCP technical probe for the three ARE colleague pilots.
 * No credentials, writes, secrets or arbitrary host URLs. Explicit calls limited
 * to published, harmless read-only operations approved in this pilot allowlist.
 */
import {writeFileSync} from "node:fs";
import {createHash} from "node:crypto";
const targets={
 "janijegoroff/agent-connectors-mcp":{endpoint:"https://agentconnectors.dev/mcp",calls:["list_categories","search_tools"]},
 "cooyun/etuki-gate":{endpoint:"https://www.etuki.com/api/v1/mcp",calls:["list_supported_models","etuki_search_models","check_context_cliff"]},
};
const repo=process.argv[2],mode=process.argv[3]||"discover";
if(!(repo in targets)||!["discover","read-task"].includes(mode))throw Error("only explicit approved pilot endpoints supported");
const {endpoint,calls}=targets[repo];
const hash=x=>createHash("sha256").update(String(x)).digest("hex");
const timeout=(millis=12000)=>AbortSignal.timeout(millis);
function parse(body){
 try{return JSON.parse(body)}catch{}
 for(const line of body.split(/\r?\n/))if(line.startsWith("data:"))try{
  const obj=JSON.parse(line.slice(5).trim());if("result" in obj||"error" in obj)return obj;
 }catch{}
 return{raw_body_sha256:hash(body),unparsed:true};
}
let seq=1,session="",version="2025-11-25";
async function call(method,params={},notify=false){
 const req={jsonrpc:"2.0",method,...(!notify?{id:seq++,params}:{})};
 const headers={Accept:"application/json, text/event-stream","Content-Type":"application/json",
   "MCP-Protocol-Version":version};
 if(session)headers["Mcp-Session-Id"]=session;
 const started=Date.now();
 const r=await fetch(endpoint,{method:"POST",redirect:"error",headers,
   body:JSON.stringify(req),signal:timeout()});
 const text=await r.text();
 const data=parse(text);
 if(r.headers.get("mcp-session-id"))session=r.headers.get("mcp-session-id");
 return{http:r.status,ms:Date.now()-started,data,content_sha256:hash(text)};
}
let init=await call("initialize",{protocolVersion:version,capabilities:{},clientInfo:{name:"ARE-colleague-pilot-readonly",version:"1.0"}});
if(!init.data.result?.protocolVersion&&init.http!==200){
 version="2025-06-18";
 init=await call("initialize",{protocolVersion:version,capabilities:{},clientInfo:{name:"ARE-colleague-pilot-readonly",version:"1.0"}});
}
if(init.data.result?.protocolVersion)version=init.data.result.protocolVersion;
const evidence={schema:"are.readonly_pilot_mcp_probe.v1",repository:repo,source:"public_unauthenticated_mcp",
 endpoint,utc:new Date().toISOString(),initialization:{http:init.http,version,
 serverInfo:init.data.result?.serverInfo??null,error:init.data.error??null},
 trace:[],tools:[],resources:[],agent_task:null};
evidence.trace.push({method:"initialize",http:init.http,ms:init.ms,sha256:init.content_sha256});
if(init.data.result){
 await call("notifications/initialized",{},true).catch(()=>{});
 const ping=await call("ping");evidence.trace.push({method:"ping",http:ping.http,ms:ping.ms,sha256:ping.content_sha256,error:ping.data.error});
 let cursor=null;
 for(let i=0;i<5;i++){
  const x=await call("tools/list",cursor?{cursor}:{});
  evidence.trace.push({method:"tools/list",http:x.http,ms:x.ms,sha256:x.content_sha256,error:x.data.error});
  evidence.tools.push(...(x.data.result?.tools||[]));
  cursor=x.data.result?.nextCursor||null;
  if(!cursor)break;
 }
 const resources=await call("resources/list");evidence.trace.push({method:"resources/list",http:resources.http,ms:resources.ms,sha256:resources.content_sha256,error:resources.data.error});
 evidence.resources=resources.data.result?.resources||[];
 if(mode==="read-task"){
  const preferred=repo.startsWith("janijegoroff")?["list_categories"]:["list_supported_models","etuki_search_models"];
  const selected=preferred.map(name=>evidence.tools.find(x=>x.name===name)).find(Boolean);
  if(selected&&calls.includes(selected.name)&&selected.annotations?.readOnlyHint===true&&selected.annotations?.destructiveHint!==true){
   const args=selected.name==="list_categories"?{}:{provider:"all"};
   const result=await call("tools/call",{name:selected.name,arguments:args});
   const summaryText=JSON.stringify(result.data?.result||result.data.error||{});
   evidence.agent_task={tool:selected.name,args,status:result.http===200&&!result.data.error?"CALL_RETURNED":"CALL_ERROR",
     isError:result.data.result?.isError===true,http:result.http,elapsed_ms:result.ms,
     result_sha256:hash(summaryText),result_bytes:Buffer.byteLength(summaryText),
     result_sample:summaryText.slice(0,12000)};
   evidence.trace.push({method:"tools/call",tool:selected.name,http:result.http,ms:result.ms,sha256:result.content_sha256});
  }else evidence.agent_task={status:"NOT_TESTED",reason:"read_only_tool_not_discovered_or_no_anotations"};
 }
}
const out="/tmp/are-pilot-mcp-"+repo.replaceAll("/","_")+"-"+mode+".json";
writeFileSync(out,JSON.stringify(evidence,null,2));
console.log(JSON.stringify({out,repository:repo,endpoint,protocol:evidence.initialization,
 tools:evidence.tools.map(x=>({name:x.name,read:x.annotations?.readOnlyHint})),resources:evidence.resources.length,
 task:evidence.agent_task,trace:evidence.trace},null,2));
