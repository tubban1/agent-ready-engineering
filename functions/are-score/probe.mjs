/**
 * Strictly limited external MCP transport probe.
 * Allows initialize and tools/list ONLY, never tools/call or resources/read.
 * HTTPS public IPv4 host, pinned DNS result, certificate verified,
 * no redirects, no query credentials, short timeout/response budget.
 */
import https from "node:https";
import {resolve4} from "node:dns/promises";
import {isIP} from "node:net";
function isPublicV4(ip){
 if(isIP(ip)!==4)return false;
 const [a,b,c]=ip.split(".").map(Number);
 return !(a===0||a===10||a===127||a>=224||
  a===169&&b===254||a===100&&b>=64&&b<=127||
  a===172&&b>=16&&b<=31||a===192&&(b===168||b===0&&c===0||
  b===0&&c===2||b===88&&c===99)||
  a===198&&(b===18||b===19||b===51&&c===100)||
  a===203&&b===0&&c===113);
}
function safeUrl(url){
 const u=new URL(url);
 const host=u.hostname.toLowerCase();
 if(u.protocol!=="https:"||u.username||u.password||u.search||u.hash||
    u.port&&u.port!=="443"||host.length>180||!host.includes(".")||
    isIP(host)||/[^a-z0-9.-]/.test(host)||host.includes("..")||
    /(^|\.)(localhost|local|internal|onion|test|invalid|example)$/.test(host)||
    /\/\.\.?($|\/)/.test(u.pathname)||/%2f|%5c|%00|%2e/i.test(u.pathname)||
    u.pathname.length>240)throw Error("mcp_public_https_endpoint_required");
 return u;
}
async function pinnedHttps(url,payload,extra={},method="POST"){
 const u=safeUrl(url);
 const ipv4=await resolve4(u.hostname);
 // The entire DNS answer must be public; pin the exact address used by TLS.
 if(!ipv4.length||ipv4.some(a=>!isPublicV4(a)))throw Error("mcp_target_non_public_ip");
 const ip=ipv4[0];
 return new Promise((done,fail)=>{
  const request=https.request(u,{method,timeout:8000,
   autoSelectFamily:false,lookup:(_host,opts,cb)=>opts?.all?cb(null,[{address:ip,family:4}]):cb(null,ip,4),servername:u.hostname,
   headers:{"Content-Type":"application/json","Accept":"application/json, text/event-stream",
    "User-Agent":"ARE-Preflight/1.0","Mcp-Protocol-Version":"2025-06-18",...extra}},
   response=>{
    if(response.statusCode!==200&&!(payload?.method==="notifications/initialized"&&[202,204].includes(response.statusCode))){response.resume();fail(Error("mcp_response_http_"+response.statusCode));return;}
    let txt="",bytes=0;
    response.setEncoding("utf8");
    response.on("data",part=>{
      bytes+=Buffer.byteLength(part);
      if(bytes>550000){request.destroy(Error("mcp_response_too_large"));return;}
      txt+=part;
    });
    response.on("end",()=>done({body:txt,bytes,headers:response.headers}));
   });
  request.on("error",fail);
  request.on("timeout",()=>request.destroy(Error("mcp_request_timeout")));
  request.end(payload===null?undefined:JSON.stringify(payload));
 });
}
function readRpc(body){
 if(body.trimStart().startsWith("{"))return JSON.parse(body);
 for(const chunk of body.split(/\r?\n\r?\n/)){
  const data=chunk.split(/\r?\n/).filter(x=>x.startsWith("data:"))
      .map(x=>x.slice(5).trim()).join("\n");
  if(data&&data!=="[DONE]"){
   try{const parsed=JSON.parse(data);if(parsed.result||parsed.error)return parsed;}catch{}
  }
 }
 throw Error("mcp_unreadable_rpc");
}
export async function readPublicProof(url){
 const r=await pinnedHttps(url,null,{},"GET");
 if(r.bytes>4000)throw Error("verification_file_too_large");
 return r.body;
}
export async function probeMcpTools(endpoint){
 const first=await pinnedHttps(endpoint,{jsonrpc:"2.0",id:1,method:"initialize",
  params:{protocolVersion:"2025-06-18",capabilities:{},clientInfo:{name:"ARE Preflight",version:"2.0"}}});
 const init=readRpc(first.body);
 if(!init.result?.protocolVersion)throw Error("mcp_initialize_failed");
 const version=String(init.result.protocolVersion);
 if(!/^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/.test(version))throw Error("mcp_invalid_negotiated_version");
 const session=first.headers["mcp-session-id"];
 const extra={"Mcp-Protocol-Version":version};
 if(typeof session==="string"&&session.length<200&&!/[\r\n]/.test(session))extra["Mcp-Session-Id"]=session;
 try{await pinnedHttps(endpoint,{jsonrpc:"2.0",method:"notifications/initialized"},extra);}catch{} // Compatibility with differing notification handling is protocol-level, not target compatibility.
 const tools=[],seen=new Set();
 let cursor=null,totalBytes=0,pageCount=0;
 do{
   if(pageCount>=5)throw Error("mcp_tools_list_pagination_limit");
   const params=cursor?{cursor}:{};
   const reply=await pinnedHttps(endpoint,{jsonrpc:"2.0",id:pageCount+2,method:"tools/list",params},extra);
   const result=readRpc(reply.body).result;
   if(!Array.isArray(result?.tools))throw Error("mcp_tools_list_unavailable");
   tools.push(...result.tools);
   totalBytes+=reply.bytes;
   if(tools.length>250||totalBytes>550000)throw Error("mcp_tools_list_too_large");
   const next=result.nextCursor;
   if(next!==undefined&&next!==null&&(typeof next!=="string"||next.length>512||seen.has(next)))
      throw Error("mcp_invalid_pagination_cursor");
   if(typeof next==="string")seen.add(next);
   cursor=next||null;
   pageCount++;
 }while(cursor);
 if(tools.length===0)throw Error("mcp_no_tools_listed");
 return {tools,version,provenance:"live_mcp_tools_list",
  evidence:[{kind:"mcp_tools_list",url:endpoint,response_bytes:totalBytes,pages:pageCount,
   note:"Verified protocol initialize + tools/list (including pagination); no business tools invoked"}]};
}
