import {z} from "zod";
import type {McpServer} from "@modelcontextprotocol/server";

const ENDPOINT="https://br-raspy-hat-b96bluqn-areintake.compute.c-7.eu-central-1.aws.neon.tech";
const TOKEN_PATTERN=/^aret_[A-Za-z0-9_-]{43}$/;
const TASK_READONLY={readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false} as const;
const TASK_SUBMISSION={readOnlyHint:false,destructiveHint:false,idempotentHint:true,openWorldHint:false} as const;
type TaskData=Record<string,unknown>;
const token=z.string().regex(TOKEN_PATTERN).describe("Task-specific scoped token from the ARE task draw page; never pass Owner Token");
function ok(data:TaskData){return {content:[{type:"text" as const,text:JSON.stringify(data,null,2)}],structuredContent:data};}
function fail(code:string){return {isError:true,content:[{type:"text" as const,text:JSON.stringify({error:code})}]};}
export async function callTaskApi(
  path:"/v3/task/read"|"/v3/task/criteria"|"/v3/task/submit"|"/v3/task/receipt"|"/v3/task/checkpoint"|"/v3/task/progress",
  taskToken:string, payload:TaskData={},requestFetch:typeof fetch=fetch
):Promise<{ok:boolean;data:TaskData}>{
 if(!TOKEN_PATTERN.test(taskToken))return {ok:false,data:{error:"invalid_task_token"}};
 if(JSON.stringify(payload).length>340000)return {ok:false,data:{error:"payload_too_large"}};
 try{
  const response=await requestFetch(ENDPOINT+path,{
    method:"POST",
    headers:{"Content-Type":"application/json","Accept":"application/json",
       Authorization:"Bearer "+taskToken},
    body:JSON.stringify(payload),redirect:"error",cache:"no-store",signal:AbortSignal.timeout(18000)
  });
  const text=await response.text();
  if(text.length>550000)return {ok:false,data:{error:"task_service_oversized_reply"}};
  const body=JSON.parse(text) as TaskData;
  if(!response.ok||body.ok===false)return {ok:false,data:{error:typeof body.error==="string"?body.error:"task_request_rejected",http_status:response.status}};
  return {ok:true,data:body};
 }catch{
  return {ok:false,data:{error:"private_task_service_unavailable"}};
 }
}
async function request(path:Parameters<typeof callTaskApi>[0],secret:string,payload:TaskData={}){
 const {ok:good,data}=await callTaskApi(path,secret,payload);
 return good?ok(data):fail(String(data.error||"task_request_rejected"));
}

export function registerTaskTools(server:McpServer):void{
 server.registerTool("are_get_task",{
  title:"Read my assigned ARE evaluation task",
  description:"Use the task-scoped Token provided by the ARE Owner to retrieve EXACTLY one assigned open-source project, assignee identity, evaluation instructions and expiry. Returns a prefilled 32-check evidence_package_template (fill actual evidence and version fields before submission). Token is not echoed and cannot authorize publication, third-party writes or other tasks.",
  inputSchema:z.object({task_token:token}),annotations:TASK_READONLY
 },async ({task_token})=>request("/v3/task/read",task_token));

 server.registerTool("are_get_criteria",{
  title:"Read 32 independent product assessment protocols for my task",
  description:"Return 8 consecutive version-pinned ARE product criteria with applicability, minimum sample counts, required evidence, procedure and pass rule. Call with offsets 0,8,16,24 until next=null. Only this assigned task's Token is accepted. Do not guess applicability or mark missing evidence PASS.",
  inputSchema:z.object({task_token:token,offset:z.number().int().min(0).max(32).default(0)}),annotations:TASK_READONLY
 },async ({task_token,offset})=>request("/v3/task/criteria",task_token,{offset}));

 server.registerTool("are_checkpoint",{
  title:"Save detailed tool-level test progress and blocking causes",
  description:"Save a resumable private per-tool coverage inventory for this task (all discovered tool names with PASS, FAIL, BLOCKED_AUTH, BLOCKED_DESIGN, BLOCKED_ENVIRONMENT, NOT_TESTED or NOT_APPLICABLE), independent trace/oracle refs, auth/design obstacles, phase and elapsed minutes. Use after each tool family or a 10-minute design blockade; this does not submit final findings, publish, or email anyone.",
  inputSchema:z.object({task_token:token,
    coverage:z.array(z.object({name:z.string(),status:z.enum(["PASS","FAIL","BLOCKED_AUTH","BLOCKED_DESIGN","BLOCKED_ENVIRONMENT","NOT_TESTED","NOT_APPLICABLE"]),
      trace_ref:z.string().optional(),oracle_ref:z.string().optional(),reason:z.string().optional()})).max(3000),
    blockers:z.array(z.object({cause:z.enum(["OAUTH","TOOL_DESIGN","RATE_LIMIT","ENVIRONMENT","SAFETY","TIME_BUDGET","UNKNOWN"]),
      reason:z.string(),trace_ref:z.string()})).max(100),
    total_tools:z.number().int().min(0).max(3000),
    phase:z.enum(["DISCOVERY","AUTH","TOOLS","REPRODUCE","REPORT","SUBMITTED"]),
    minutes_used:z.number().int().min(0).max(1440)}),
  annotations:TASK_SUBMISSION
 },async ({task_token,...fields})=>request("/v3/task/checkpoint",task_token,fields));

 server.registerTool("are_submit_assessment",{
  title:"Submit my complete private independent assessment to ARE Neon",
  description:"Write an evidence-backed, version-pinned, private ARE_INDEPENDENT product report for exactly the project assigned to this Task Token. Start from the evidence_package_template provided by are_get_task and replace placeholders with real source SHA, actual version and evidence. Package needs cohort_id, repository_key, report (32 pilot findings), tool_coverage for every discovered tool, test_blockers, test_metadata with discovered_tool_count/minutes_used, agent_tasks, summary and recommendations. Existing private assessments are preserved. Same content+task is idempotent. This tool NEVER publishes third-party reviews, emails a maintainer or certifies maturity.",
  inputSchema:z.object({task_token:token,evidence_package:z.record(z.string(),z.unknown()).describe("Full independently gathered evidence package; not a PDF, fabricated tests, or a published review")}),
  annotations:TASK_SUBMISSION
 },async ({task_token,evidence_package})=>request("/v3/task/submit",task_token,evidence_package));

 server.registerTool("are_get_submission",{
  title:"Check private ARE task submission receipt",
  description:"Check the most recent submission status or a submission UUID for this exact task. The Task Token cannot access other projects, owner inbox or public publishing actions.",
  inputSchema:z.object({task_token:token,submission_id:z.string().uuid().optional()}),annotations:TASK_READONLY
 },async ({task_token,submission_id})=>request("/v3/task/receipt",task_token,submission_id?{submission_id}:{}));
}
