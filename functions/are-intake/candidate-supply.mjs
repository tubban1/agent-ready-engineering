import {verifyRepositoryCandidate} from "./quality-screening.mjs";
// Periodically refill an evidence-qualified pool, not an arbitrary collection of demos.
// GitHub is the only remote discovery host; no untrusted candidate URL is fetched.
export const SUPPLY_LEASE_SQL=[
 "UPDATE are_eval.private_pool_refill_control SET next_at=now()+interval '20 minutes',last_started_at=now()",
 "WHERE id=1 AND next_at<=now() RETURNING id,next_at"
].join(" ");
export const SUPPLY_PICK_SQL=[
 "SELECT json_build_object('rows',COALESCE(json_agg(row_to_json(x)),'[]'::json))::text FROM (",
 "SELECT c.repository_key,c.display_name,c.observed_tool_count,c.tool_count,c.stage",
 "FROM are_eval.benchmark_study_candidates c LEFT JOIN are_eval.private_project_pool p",
 "ON p.cohort_id=c.cohort_id AND p.repository_key=c.repository_key",
 "WHERE c.cohort_id='ARE100-VALUE-20261115' AND p.repository_key IS NULL",
 "ORDER BY (c.observed_tool_count>=3) DESC,c.observed_tool_count DESC,c.repository_key LIMIT 10) x"
].join(" ");
export const SUPPLY_SAVE_SQL=[
 "WITH picked AS (SELECT c.repository_key FROM are_eval.benchmark_study_candidates c",
 "WHERE c.cohort_id='ARE100-VALUE-20261115' AND c.repository_key=$1",
 "AND NOT EXISTS (SELECT 1 FROM are_eval.private_project_pool p",
 "WHERE p.cohort_id=c.cohort_id AND p.repository_key=c.repository_key) FOR UPDATE),",
 "updated AS (UPDATE are_eval.benchmark_study_candidates c SET",
 "repository_match_verified=$2,creator_contact_verified=$3,",
 "repository_match_evidence=$4::jsonb,creator_contact_evidence=$5::jsonb",
 "FROM picked WHERE c.cohort_id='ARE100-VALUE-20261115' AND c.repository_key=picked.repository_key",
 "RETURNING c.repository_key),",
 "inserted AS (INSERT INTO are_eval.private_project_pool",
 "(cohort_id,repository_key,decision,reason,tool_count,auth_mode,risk_level,runtime_endpoint,priority,quality_score,quality_breakdown,quality_evidence)",
 "SELECT 'ARE100-VALUE-20261115',u.repository_key,$6,$7,$8,'UNKNOWN','LOW',$9,$10,$11,$12::jsonb,$13::jsonb",
 "FROM updated u ON CONFLICT(cohort_id,repository_key) DO NOTHING RETURNING repository_key,decision,quality_score)",
 "SELECT COALESCE((SELECT row_to_json(inserted) FROM inserted),'null'::json)::text"
].join(" ");
export const SUPPLY_IMPORT_SQL=[
 "WITH added AS (INSERT INTO are_eval.benchmark_study_candidates",
 "(cohort_id,world2_service_id,repository_key,repository_owner,display_name,stage,evidence_scope)",
 "SELECT 'ARE100-VALUE-20261115',gen_random_uuid(),$1,$2,$3,'github_discovered_unverified',",
 "'public_github_repo_metadata_no_mcp_tool_probe'",
 "WHERE NOT EXISTS (SELECT 1 FROM are_eval.benchmark_study_candidates c",
 "WHERE c.cohort_id='ARE100-VALUE-20261115' AND",
 "(c.repository_key=$1 OR c.repository_owner=$2))",
 "ON CONFLICT DO NOTHING RETURNING repository_key)",
 "SELECT COALESCE((SELECT row_to_json(added) FROM added),'null'::json)::text"
].join(" ");
export const SUPPLY_DISCOVERY_CURSOR_SQL=[
 "SELECT json_build_object('page',discovery_page,'query_index',discovery_query_index)::text",
 "FROM are_eval.private_pool_refill_control WHERE id=1"
].join(" ");
export const SUPPLY_ADVANCE_DISCOVERY_SQL=[
 "UPDATE are_eval.private_pool_refill_control",
 "SET discovery_page=CASE WHEN discovery_page>=10 THEN 1 ELSE discovery_page+1 END,",
 "discovery_query_index=CASE WHEN discovery_page>=10 THEN (discovery_query_index+1)%4",
 "ELSE discovery_query_index END WHERE id=1",
 "RETURNING discovery_page,discovery_query_index"
].join(" ");
const discoveryQueries=[
 "topic:mcp-server","mcp server in:name,description",
 "topic:model-context-protocol","mcp in:readme"
];
export const SUPPLY_STATUS_SQL=[
 "UPDATE are_eval.private_pool_refill_control SET last_finished_at=now(),last_result=$1::jsonb",
 "WHERE id=1 RETURNING last_finished_at"
].join(" ");

const repoName=/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i;
const excludedHosts=new Set(["github.com","raw.githubusercontent.com","img.shields.io","vscode.dev",
 "insiders.vscode.dev","npmjs.com","www.npmjs.com","glama.ai","registry.modelcontextprotocol.io"]);
export function documentedEndpoints(readme){
 if(typeof readme!=="string")return [];
 const raw=readme.match(/https:\/\/[^\s<>"'\x60()\[\]{}]{8,350}/gi)||[];
 const urls=[];
 for(let part of raw){
  part=part.replace(/[,.;*]+$/g,"").replace(/\/+$/g,"");
  try{
   const url=new URL(part);
   const host=url.hostname.toLowerCase();
   if(url.protocol!=="https:"||url.username||url.password||url.port||
    excludedHosts.has(host)||host==="localhost"||host.endsWith(".local")||
    host.endsWith(".internal")||/^\d+\.\d+\.\d+\.\d+$/.test(host)||
    !host.includes(".")||url.search||url.hash||url.pathname.length>85||
    !/\/(?:mcp|sse)$/i.test(url.pathname))continue;
   if(!urls.includes(url.href))urls.push(url.href);
  }catch{}
 }
 return urls.slice(0,5);
}
const API="https://api.github.com";
const headers={"User-Agent":"ARE-public-candidate-replenisher/1.0",
 "Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"};
async function githubGet(path,fetchImpl){
 const r=await fetchImpl(API+path,{method:"GET",headers,redirect:"error",signal:AbortSignal.timeout(6500)});
 if(r.status===404)return null;
 if(!r.ok)throw new Error("github_rate_limited_or_unavailable_"+r.status);
 return r.json();
}
export function objectiveScreen({repo,readme,endpoint,observedTools,verified,contact}){
 const description=String(repo.description||"");
 const words=(description+" "+readme).slice(0,120000);
 const recent=Number.isFinite(Date.parse(repo.pushed_at)) &&
   Date.now()-Date.parse(repo.pushed_at)<180*86400000;
 const docs={use_case:/\b(use cases?|features?|capabilit(?:y|ies)|what (?:is|does)|applications?)\b|场景|功能/i.test(words),
  examples:/\b(example|quickstart|getting started|usage|how to|installation)\b|示例|使用方法/i.test(readme),
  tool_docs:/\b(tools?|resources?|prompts?)\b|工具/i.test(readme)};
 const business=(description.length>=30?8:0)+(docs.use_case?9:0)+(docs.examples?8:0)+(observedTools>=3?5:0);
 const stars=Number(repo.stargazers_count)||0,forks=Number(repo.forks_count)||0;
 const adoption=Math.min(20,(stars>=100?18:stars>=30?15:stars>=10?10:stars>=2?5:0)+(forks>=1?2:0));
 const license=typeof repo.license?.spdx_id==="string"&&!["NOASSERTION","NONE"].includes(repo.license.spdx_id);
 const engineering=(recent?10:0)+(license?5:0)+(repo.archived===false?3:0)+(docs.examples?2:0);
 const assessability=(verified?10:0)+(observedTools>=3?5:0)+(observedTools>=10?5:0);
 const outreach=(contact?5:0)+(repo.has_issues?2:0)+(repo.owner?.type==="Organization"?3:0);
 const breakdown={business_value:business,adoption,engineering,assessability,outreach};
 const score=Object.values(breakdown).reduce((a,b)=>a+b,0);
 // These are observable selection signals, not independent proof of business value.
 const eligible=Boolean(verified&&recent&&license&&observedTools>=3&&score>=75);
 return {eligible,score,breakdown,source_facts:{stars,forks,recent,license,observedTools,docs,
  declared_endpoint_verified:verified,public_contact:contact},endpoint};
}
async function screenOne(row,fetchImpl){
 if(!repoName.test(row.repository_key))throw new Error("invalid_repository_key");
 const [owner,repo]=row.repository_key.split("/");
 const path="/repos/"+encodeURIComponent(owner)+"/"+encodeURIComponent(repo);
 const [meta,readmeFile]=await Promise.all([githubGet(path,fetchImpl),githubGet(path+"/readme",fetchImpl)]);
 if(!meta||String(meta.full_name||"").toLowerCase()!==row.repository_key.toLowerCase()||
   meta.private||meta.archived||readmeFile?.encoding!=="base64")return null;
 const readme=Buffer.from(String(readmeFile.content||"").replace(/\s/g,""),"base64").toString("utf8").slice(0,180000);
 const endpoints=documentedEndpoints(readme);
 if(!endpoints.length)return null;
 // Deliberately no POST to untrusted URLs. A published link is not deployment attestation.
 const endpoint=endpoints[0].replace(/\/+$/,"");
 const memo={...meta};
 const cachedFetch=async url=>{
  if(url===API+path)return {status:200,json:async()=>memo};
  if(url===API+path+"/readme")return {status:200,json:async()=>readmeFile};
  throw new Error("non_github_request_rejected");
 };
 const checked=await verifyRepositoryCandidate(row.repository_key,endpoint,cachedFetch);
 const observedTools=Number(row.observed_tool_count)||0;
 const q=objectiveScreen({repo:meta,readme,endpoint,observedTools,
  verified:checked.repository_match_verified,contact:checked.creator_contact_verified});
 return {checked,q,endpoint,observedTools,metadata:meta,readme_url:readmeFile.html_url};
}
export async function replenishQualifiedPool(sql,{fetchImpl=fetch}={}){
 const lease=await sql(SUPPLY_LEASE_SQL);
 if(!lease)return {ok:true,skipped:"cooldown"};
 const saved={examined:0,qualified:0,held:0,imported:0,errors:0};
 try{
  const initial=await sql(SUPPLY_PICK_SQL);const rows=(initial?.rows||[]).slice(0,8);
  if(!rows.length){
   // Public GitHub discovery extends beyond the original 100.
   // Imported projects remain UNFILTERED until verifiable tool observations exist.
   try{
    const cursor=await sql(SUPPLY_DISCOVERY_CURSOR_SQL);
    const page=Math.max(1,Math.min(10,Number(cursor?.page)||1));
    const query=discoveryQueries[Math.max(0,Math.min(3,Number(cursor?.query_index)||0))];
    const search=await githubGet("/search/repositories?q="+encodeURIComponent(query)+
     "&sort=updated&order=desc&per_page=40&page="+page,fetchImpl);
    for(const r of (search?.items||[]).slice(0,20)){
     if(!repoName.test(r.full_name||"")||r.private||r.archived)continue;
     const inserted=await sql(SUPPLY_IMPORT_SQL,[r.full_name,r.owner?.login||r.full_name.split("/")[0],
       String(r.description||r.name).slice(0,180)]);
     if(inserted)saved.imported++;
    }
    await sql(SUPPLY_ADVANCE_DISCOVERY_SQL);
   }catch{saved.errors++}
  }else{
   const results=await Promise.allSettled(rows.map(row=>screenOne(row,fetchImpl)));
   for(let i=0;i<rows.length;i++){
    const row=rows[i],result=results[i];
    if(result.status!=="fulfilled"){saved.errors++;continue}
    saved.examined++;
    const evidence=result.value;
    if(!evidence){
      const reason="Official GitHub repository or suitable documented public MCP endpoint was not found";
      const marker={verified:false,checked_at:new Date().toISOString(),method:"github_readme_source_screen",note:reason};
      const r=await sql(SUPPLY_SAVE_SQL,[row.repository_key,false,false,
        JSON.stringify(marker),JSON.stringify(marker),"HOLD",reason,
        Number(row.observed_tool_count)||0,"",0,0,JSON.stringify({}),JSON.stringify({
          rubric:"are.automated-source-signal.v1",provisional:true,notes:reason,urls:[]})]);
      if(r)saved.held++;
      continue;
    }
    const {checked,q,endpoint,readme_url}=evidence;
    const decision=q.eligible?"ELIGIBLE":"HOLD";
    const note="Automated provisional source-screening only. GitHub source facts, documented use case and published endpoint were inspected. No live deployment provenance, business utility or authenticated tool behavior has been independently certified.";
    const record=await sql(SUPPLY_SAVE_SQL,[row.repository_key,checked.repository_match_verified,
     checked.creator_contact_verified,JSON.stringify(checked.repository_match_evidence),
     JSON.stringify(checked.creator_contact_evidence),decision,
     decision==="ELIGIBLE"?"Source-backed automated high-confidence candidate":"Awaiting independent observed tools or quality/source requirements",
     Math.min(3000,Number(row.observed_tool_count)||0),endpoint,Math.min(100,q.score),
     q.score,JSON.stringify(q.breakdown),JSON.stringify({rubric:"are.automated-source-signal.v1",
      provisional:true,urls:[checked.repository_match_evidence.github_repository,readme_url].filter(Boolean),
      notes:note,metrics:q.source_facts,scored_at:new Date().toISOString()})]);
    if(record&&q.eligible)saved.qualified++;else saved.held++;
   }
  }
 }finally{await sql(SUPPLY_STATUS_SQL,[JSON.stringify(saved)])}
 return {ok:true,...saved};
}
