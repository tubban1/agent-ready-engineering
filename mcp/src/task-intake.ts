import {z} from "zod";
import type {McpServer} from "@modelcontextprotocol/server";

const ENDPOINT="https://br-raspy-hat-b96bluqn-areintake.compute.c-7.eu-central-1.aws.neon.tech";
const TOKEN_PATTERN=/^aret_[A-Za-z0-9_-]{43}$/;
const TASK_READONLY={readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false} as const;
const TASK_SUBMISSION={readOnlyHint:false,destructiveHint:false,idempotentHint:true,openWorldHint:false} as const;
const TASK_CAPTURE={readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:false} as const;
type TaskData=Record<string,unknown>;
const token=z.string().regex(TOKEN_PATTERN).describe("Task-specific scoped token from the ARE task draw page; never pass Owner Token");
function ok(data:TaskData){return {content:[{type:"text" as const,text:JSON.stringify(data,null,2)}],structuredContent:data};}
function fail(code:string){return {isError:true,content:[{type:"text" as const,text:JSON.stringify({error:code})}]};}
export async function callTaskApi(
  path:"/v3/task/read"|"/v3/task/criteria"|"/v3/task/contract"|"/v3/task/capture"|"/v3/task/submit"|"/v3/task/receipt"|"/v3/task/validate"|"/v3/task/checkpoint"|"/v3/task/progress"|"/v3/task/auth/request"|"/v3/task/auth/status"|"/v3/task/auth/handoff",
  taskToken:string, payload:TaskData={},requestFetch:typeof fetch=fetch
):Promise<{ok:boolean;data:TaskData}>{
 if(!TOKEN_PATTERN.test(taskToken))return {ok:false,data:{error:"invalid_task_token"}};
 if(Buffer.byteLength(JSON.stringify(payload))>1800000)return {ok:false,data:{error:"payload_too_large"}};
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

 server.registerTool("are_request_authorization",{
  title:"Record target MCP authentication challenge and initiate provider-native login",
  description:"When the target MCP needs OAuth OR API_KEY, register its actual scheme then ACT. OAuth: proactively open official provider consent in host browser. API_KEY: proactively open official account/signup/key setup page and offer the user secure host key configuration. Never just record BLOCKED_AUTH and submit without giving the user a provider-side choice. No ARE approval. Then record are_record_provider_handoff START/FINISH with real navigation/outcome. Never paste secrets in chat/ARE, silently register user accounts or perform destructive writes.",
  inputSchema:z.object({task_token:token,
   reason:z.string().min(12).max(500).describe("User-visible authorization requirement, scoped to the screened project; never credentials"),
   requested_scopes:z.array(z.string().min(1).max(100)).max(20).default([]),
   auth_scheme:z.enum(["OAUTH","API_KEY","UNKNOWN"]).default("UNKNOWN").describe("Actual observed mechanism; no ARE preauthorization choice is required. The user consents at the provider.")}),
  annotations:TASK_SUBMISSION
 },async ({task_token,reason,requested_scopes,auth_scheme})=>
   request("/v3/task/auth/request",task_token,{reason,requested_scopes,auth_scheme}));

 server.registerTool("are_record_provider_handoff",{
  title:"Log actual provider browser handoff for OAuth or API key, then user/host outcome",
  description:"REQUIRED for a partial assessment containing BLOCKED_AUTH. START only after opening the official provider login/account/API-key page or presenting a verified official link in the user-visible host; record the official source URL and actual host navigation reference. For a preconfigured credential, use PRECONFIGURED_CREDENTIAL and a source URL instead. FINISH only after actual outcome AUTHENTICATED, PROVIDER_FAILED, HOST_UNSUPPORTED or CREDENTIAL_UNAVAILABLE, with real host/provider outcome event reference. USER_DECLINED is NOT accepted from this Agent-controlled tool; the system has no independently trusted human refusal event yet, so the task stays open pending host/provider attestation. A .well-known OAuth resource metadata URL is NOT a user authorization page. WAITING_FOR_USER cannot be submitted. Evidence is Agent-reported and must be independently reviewed. Never include secrets, callback codes, API keys or passwords. Third-party account creation, identity/email verification, messaging and payment require real prior user permission; dummy email is NOT consent. RFC 9728 metadata is NOT a login page. An Agent-authored USER_DECLINED string does not prove a human refused. Keep the task pending until a trustworthy user/provider/host outcome is available.",
  inputSchema:z.object({task_token:token,phase:z.enum(["START","FINISH"]),
    auth_scheme:z.enum(["OAUTH","API_KEY"]).optional(),
    host_action:z.enum(["BROWSER_OPENED","VERIFIED_LINK_SHOWN","HOST_UNSUPPORTED","PRECONFIGURED_CREDENTIAL"]).optional(),
    host_action_ref:z.string().min(8).max(240).optional(),
    provider_url:z.string().nullable().optional(),source_url:z.string().nullable().optional(),
    note:z.string().min(20).max(600),
    outcome:z.enum(["AUTHENTICATED","PROVIDER_FAILED","HOST_UNSUPPORTED","CREDENTIAL_UNAVAILABLE"]).optional(),
    outcome_ref:z.string().min(8).max(240).optional()}),
  annotations:TASK_SUBMISSION
 },async ({task_token,phase,auth_scheme,host_action,host_action_ref,provider_url,source_url,note,outcome,outcome_ref})=>
   request("/v3/task/auth/handoff",task_token,phase==="START"?
    {phase,auth_scheme,host_action,host_action_ref,provider_url:provider_url??null,source_url:source_url??null,note}:
    {phase,outcome,outcome_ref,note}));

 server.registerTool("are_get_authorization_status",{
  title:"Read task-scoped authentication handoff status, not third-party consent",
  description:"Shows the task-scoped AUTH CHALLENGE, not third-party consent. Historical database field GRANTED means challenge registered, NOT provider approval. For OAuth or API_KEY proactively open the official provider's login/key page and log are_record_provider_handoff START/FINISH. Real successful native MCP tool traces are the only evidence of authenticated execution.",
  inputSchema:z.object({task_token:token}),annotations:TASK_READONLY
 },async ({task_token})=>request("/v3/task/auth/status",task_token));

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

 server.registerTool("are_get_evidence_contract",{
  title:"Get ARE V5.3 strict assessment contract, required MCP setup and safe teardown lifecycle",
  description:"Breaking V5.2: tool PASS requires independent domain/semantic oracle, not text-only success; BLOCKED must match actual native error, criterion PASS must reference relevant tests/docs. Old V5.1 payloads are rejected. Includes required target-MCP discovery, host-specific setup/connection, provider OAuth, real smoke test and bounded task-owned teardown after confirmed COMPLETE Neon submission. Read EXACT machine-readable requirements for all 32 ARE criteria (applicability conditions, evidence metrics, minimum samples), stable raw MCP observation grammar, independent oracle proof, agent goals and deployment binding; use this instead of trial/error or cloning the source repo. This tool does not submit or alter anything.",
  inputSchema:z.object({task_token:token}),annotations:TASK_READONLY
 },async ({task_token})=>request("/v3/task/contract",task_token));

 server.registerTool("are_capture_readonly",{
  title:"Capture an independently observed read-only MCP response from a screened target",
  description:"ARE's server calls the task's already-screened PUBLIC HTTPS MCP (NO auth tokens or arbitrary URLs). tools/list is always allowed; tools/call requires human-approved safe testing, verified readOnlyHint=true, destructiveHint=false and openWorldHint=false, and excludes write-like names. Returns one scoped immutable server-origin raw request/response artifact with content SHA-256 and capture_id. This writes only a private observation to Neon; the target call is read-only by screened tool contract, not guaranteed safe if vendor metadata lies. Strict quotas. Screened UNKNOWN/OAUTH/API_KEY targets may still expose truly anonymous tools/list and safe read calls; an actual 401/403 stops server capture. No provider credentials are sent. Large captures return only capture_id, SHA-256, names and cursor; original immutable bytes remain private in ARE for rehydration at preflight. Use the Agent host for OAuth-protected tools or STDIO and label such host captures unverified until manual review.",
  inputSchema:z.object({task_token:token,method:z.enum(["tools/list","tools/call"]),
    tool_name:z.string().max(128).optional(),cursor:z.string().min(1).max(500).optional(),arguments:z.record(z.string(),z.unknown()).optional(),
    user_authorized:z.boolean().optional()}),
  annotations:TASK_CAPTURE
 },async ({task_token,...fields})=>request("/v3/task/capture",task_token,fields));

 server.registerTool("are_validate_assessment",{
  title:"Preflight entire ARE report without storing it",
  description:"MANDATORY before are_submit_assessment. Authorization challenges must be submitted as ARE-owned human requests; every blocked tool must distinguish ENDPOINT from TOOL; activity duration must be instrumented or UNKNOWN; PARTIAL is distinct from database submission and VERIFIED. V5 requires exact published applies_when fact proofs and pass_if metrics (no wrong PASS or invented N/A), real raw MCP request/response traces, reproducible independent oracles, Agent goals and honest deployment binding. Returns per-path blocking issues, canonical structured result preview and summary. This tool is strictly read-only: it does not create a private run, consume submission capacity, send mail or publish anything. Re-run after repairing each issue until valid=true.",
  inputSchema:z.object({task_token:token,evidence_package:z.record(z.string(),z.unknown()).describe("Complete draft of the ARE independent assessment with evidence_artifacts")}),
  annotations:TASK_READONLY
 },async ({task_token,evidence_package})=>request("/v3/task/validate",task_token,evidence_package));

 server.registerTool("are_submit_assessment",{
  title:"Submit my complete private independent assessment to ARE Neon",
  description:"Strict current V5.3: do not self-claim a human refusal; account/email/payment success without trusted human permission cannot earn accepted PASS; next_action=collect_code is unfinished, shared gateway 401 is not multiple independent tool traces. After a successful PRIVATE Neon receipt, the Agent may remove only setup_manifest-proven task-owned MCP connections/isolated installs if test_completion.status=COMPLETE; never touch existing MCPs, shared dependencies or retained evidence. PARTIAL/unconfirmed submissions forbid automatic deletion. Write a private evidence-backed product report; partial results are permitted after an actual human authorization request, but incomplete tests cannot be marked COMPLETE or reviewer-VERIFIED. Never invent time spent, human consent, independent source or per-tool execution. Write an evidence-backed, version-pinned, private ARE_INDEPENDENT product report for exactly the project assigned to this Task Token. Start from the evidence_package_template provided by are_get_task and replace placeholders with real source SHA, actual version and evidence. Package needs cohort_id, repository_key, report (32 pilot findings), tool_coverage for every discovered tool, test_blockers, test_metadata with discovered_tool_count/minutes_used, agent_tasks, summary and recommendations. First call are_get_evidence_contract, use are_capture_readonly for anonymous tools/list and permitted safe reads even with uncertain screening auth_mode; do not transmit provider credentials, then call are_validate_assessment until valid=true; rejected drafts never enter Neon. Include evidence_artifacts (content, SHA-256, provenance, type and stable references), independently checked agent_tasks, source_binding evidence, and a complete 32-check result. Use the canonical_report returned by this submission, not invented prose. Post-submission receipts are visible on the ARE tester webpage; the Task Token is no longer usable. ONLY ONE formal submission is permitted per Task ID. Perform all authorized testing, checkpointing and repeated read-only validation before submitting. A successful submission is immutable, saves one private Neon report and immediately REVOKES this Task Token atomically; the canonical report and submission_id are in this tool's response. A network retry after token revocation cannot submit again. If human review requests retesting, a NEW Task ID is issued and the old report is preserved. This tool NEVER publishes third-party reviews, emails a maintainer or certifies maturity.",
  inputSchema:z.object({task_token:token,evidence_package:z.record(z.string(),z.unknown()).describe("Full independently gathered evidence package; not a PDF, fabricated tests, or a published review")}),
  annotations:TASK_SUBMISSION
 },async ({task_token,evidence_package})=>request("/v3/task/submit",task_token,evidence_package));

 server.registerTool("are_get_submission",{
  title:"Check private ARE task submission receipt",
  description:"The one-time are_submit_assessment response returns submission_id and cleanup_eligibility. Only an authenticated receipt or confirmed submit response permits tightly scoped task-owned teardown; token revocation means this tool cannot re-read after submission. Before a task's final one-time submission, retrieve any existing task receipt; after formal submission the Token automatically expires and this tool will reject it. The original tester can permanently inspect Neon-confirmed receipts in their own ARE task webpage. No access to other projects or owner inbox.",
  inputSchema:z.object({task_token:token,submission_id:z.string().uuid().optional()}),annotations:TASK_READONLY
 },async ({task_token,submission_id})=>request("/v3/task/receipt",task_token,submission_id?{submission_id}:{}));
}
