// Evidence-scoped, non-destructive MCP 2026-07-28 HTTP conformance probe.
// No tools/call, no authentication, no business data or L0–L4 maturity claim.
import { pathToFileURL } from "node:url";

const MODERN = "2026-07-28";
function meta(version=MODERN) {
  return {
    "io.modelcontextprotocol/protocolVersion":version,
    "io.modelcontextprotocol/clientCapabilities":{},
    "io.modelcontextprotocol/clientInfo":{name:"are-protocol-probe",version:"1.0"}
  };
}
async function readBody(res) {
  const t=await res.text();
  if(res.headers.get("content-type")?.includes("text/event-stream")) {
    const data=t.split(/\r?\n/).filter(l=>l.startsWith("data: ")).map(l=>l.slice(6));
    return data.length?JSON.parse(data[data.length-1]):null;
  }
  try {return JSON.parse(t);} catch{return null;}
}
function result(id,status,evidence) {return {id,status,evidence};}
export async function probe(target,fetcher=fetch) {
  const url=new URL(target);
  if(url.protocol!=="https:") throw new Error("Only explicitly provided HTTPS MCP endpoints may be probed");
  const findings=[];
  let index=0;
  async function rpc(method,version=MODERN,opts={}) {
    const params={...opts.params,_meta:meta(version)};
    const headers={
      "content-type":"application/json",
      accept:"application/json, text/event-stream",
      "MCP-Protocol-Version": version,
      "Mcp-Method": opts.wrongMethod?"not/the-request-method":method,
      ...(opts.origin?{Origin:opts.origin}:{}),
    };
    const req=new Request(url,{method:"POST",headers,body:JSON.stringify({
      jsonrpc:"2.0",id:++index,method,params
    }),signal:AbortSignal.timeout(15000)});
    const res=await fetcher(req);
    return {httpStatus:res.status,payload:await readBody(res),contentType:res.headers.get("content-type")};
  }
  let discovery,tools;
  try {
    discovery=await rpc("server/discover");
    const valid=discovery.httpStatus===200&&discovery.payload?.result?.supportedVersions?.includes(MODERN);
    findings.push(result("MCP26-01",discovery.httpStatus===200?"PASS":"FAIL",{httpStatus:discovery.httpStatus}));
    findings.push(result("MCP26-02",valid?"PASS":"UNKNOWN",{version:MODERN}));
    findings.push(result("MCP26-03",valid&&Boolean(discovery.payload.result.capabilities?.tools)&&Boolean(discovery.payload.result._meta?.["io.modelcontextprotocol/serverInfo"])?"PASS":"FAIL",
      {supportedVersions:discovery.payload?.result?.supportedVersions||[],hasToolsCapability:Boolean(discovery.payload?.result?.capabilities?.tools),serverInfo:discovery.payload?.result?._meta?.["io.modelcontextprotocol/serverInfo"]?.name||null}));
    findings.push(result("MCP26-04",discovery.payload?.result?.resultType==="complete"?"PASS":"FAIL",{resultType:discovery.payload?.result?.resultType||null}));
  }catch(err){for(const rule of ["MCP26-01","MCP26-02","MCP26-03","MCP26-04"])findings.push(result(rule,"UNKNOWN",{error:String(err)}));}
  try {
    tools=await rpc("tools/list");
    const t=tools.payload?.result;
    const ok=tools.httpStatus===200&&Array.isArray(t?.tools);
    findings.push(result("MCP26-05",ok&&Number.isFinite(t.ttlMs)&&["public","private"].includes(t.cacheScope)?"PASS":"FAIL",
      {httpStatus:tools.httpStatus,ttlMs:t?.ttlMs??null,cacheScope:t?.cacheScope??null,toolCount:Array.isArray(t?.tools)?t.tools.length:null}));
    if(ok) {
      const retry=await rpc("tools/list");
      findings.push(result("MCP26-08",JSON.stringify(t.tools.map(t=>t.name))===JSON.stringify(retry.payload?.result?.tools?.map(t=>t.name))?"PASS":"FAIL",{requests:2,toolCount:t.tools.length}));
    } else findings.push(result("MCP26-08","UNKNOWN",{reason:"tools/list unavailable"}));
  }catch(err){for(const rule of ["MCP26-05","MCP26-08"])findings.push(result(rule,"UNKNOWN",{error:String(err)}));}
  try {
    const bad=await rpc("tools/list",MODERN,{wrongMethod:true});
    findings.push(result("MCP26-06",bad.httpStatus===400&&bad.payload?.error?.code===-32020?"PASS":"FAIL",
      {httpStatus:bad.httpStatus,errorCode:bad.payload?.error?.code??null}));
  } catch(err){findings.push(result("MCP26-06","UNKNOWN",{error:String(err)}));}
  try {
    const bad=await rpc("tools/list",MODERN,{origin:"https://untrusted-origin.invalid"});
    findings.push(result("MCP26-07",bad.httpStatus===403?"PASS":"FAIL",{httpStatus:bad.httpStatus}));
  } catch(err){findings.push(result("MCP26-07","UNKNOWN",{error:String(err)}));}
  try {
    const bad=await rpc("tools/list","1900-01-01");
    findings.push(result("MCP26-09",bad.httpStatus===400&&bad.payload?.error?.code===-32022&&bad.payload.error.data?.supported?.includes(MODERN)?"PASS":"FAIL",
      {httpStatus:bad.httpStatus,errorCode:bad.payload?.error?.code??null,versions:bad.payload?.error?.data?.supported||[]}));
  } catch(err){findings.push(result("MCP26-09","UNKNOWN",{error:String(err)}));}
  findings.push(result("MCP26-10","NOT_APPLICABLE",{reason:"Only explicitly public, unauthenticated interface tested; OAuth not exercised"}));
  findings.push(result("MCP26-11","UNKNOWN",{reason:"Streaming subscriptions/listen not exercised by this bounded probe"}));
  return {profile:"public-readonly-streamable-http",specVersion:MODERN,endpoint:url.toString(),timestamp:new Date().toISOString(),rules:findings,
    counts: Object.fromEntries(["PASS","FAIL","UNKNOWN","NOT_APPLICABLE"].map(k=>[k,findings.filter(f=>f.status===k).length])),
    fullConformanceCertified:false,engineeringMaturityAssessed:false,
    limitations:["Only safe metadata RPCs. No external tools/call, auth, task extension, MRTR or persistent subscriptions are tested.","A passing profile is not official MCP certification."]};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  probe(process.argv[2]||"https://are.fde.fan/mcp").then(report=>{
    console.log(JSON.stringify(report,null,2));
    process.exitCode=report.counts.FAIL?1:0;
  }).catch(err=>{console.error(err.message);process.exitCode=2;});
}
