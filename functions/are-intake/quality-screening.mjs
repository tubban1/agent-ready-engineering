// Private ARE screening. Evidence is drawn from GitHub's fixed official API, not assessor claims.
// README linking a live endpoint verifies a published reference, NOT code-to-deployment provenance.
export const QUALITY_WEIGHTS=Object.freeze({
 business_value:30,adoption:20,engineering:20,assessability:20,outreach:10
});
const repoPattern=/^[a-z\d_.-]+\/[a-z\d_.-]+$/i;
const fail=code=>{const e=new Error(code);e.code=code;throw e};
const sourceUrl=u=>typeof u==="string"&&u.length<=400&&/^https:\/\/[^@/\s]+\//i.test(u)&&
 !/[\s<>"'\\]/.test(u);
export function qualityAssessment(input){
 const values=input?.breakdown,src=input?.evidence;
 if(!values||typeof values!=="object"||Array.isArray(values)||
    Object.keys(values).sort().join(",")!==Object.keys(QUALITY_WEIGHTS).sort().join(",")||
    !src||typeof src!=="object"||Array.isArray(src))fail("invalid_quality_assessment");
 let total=0;
 for(const [key,max] of Object.entries(QUALITY_WEIGHTS)){
  if(!Number.isInteger(values[key])||values[key]<0||values[key]>max)fail("invalid_quality_score");
  total+=values[key];
 }
 if(!Array.isArray(src.urls)||src.urls.length<2||src.urls.length>8||
    src.urls.some(u=>!sourceUrl(u))||
    typeof src.notes!=="string"||src.notes.trim().length<30||src.notes.length>1600)
   fail("quality_evidence_required");
 return {score:total,breakdown:values,evidence:{
  urls:[...new Set(src.urls)],notes:src.notes.trim(),rubric:"are.candidate-quality.v1",
  evaluated_at:new Date().toISOString(),
  weights:QUALITY_WEIGHTS,
  limitations:"Human-scored: sources are review references, not independently attested business value"
 }};
}
const headers={"Accept":"application/vnd.github+json",
 "X-GitHub-Api-Version":"2022-11-28","User-Agent":"ARE-candidate-screening/1.0"};
async function getJson(path,requestFetch){
 let response;
 try{response=await requestFetch("https://api.github.com"+path,{
   method:"GET",headers,signal:AbortSignal.timeout(9000)})}
 catch{fail("github_screening_unavailable")}
 if(response.status===404)return null;
 if(response.status!==200)fail("github_screening_unavailable");
 try{return await response.json()}catch{fail("github_invalid_response")}
}
export async function verifyRepositoryCandidate(repository_key,runtime_endpoint,requestFetch=fetch){
 if(!repoPattern.test(repository_key||"")||repository_key.length>160||
    typeof runtime_endpoint!=="string"||!/^https:\/\//.test(runtime_endpoint)||
    runtime_endpoint.length>400)fail("invalid_screening_target");
 const [owner,repo]=repository_key.split("/");
 const path="/repos/"+encodeURIComponent(owner)+"/"+encodeURIComponent(repo);
 const record=await getJson(path,requestFetch);
 if(!record||String(record.full_name||"").toLowerCase()!==repository_key.toLowerCase()||
    record.private===true||record.archived===true)fail("github_public_repository_missing");
 const readme=await getJson(path+"/readme",requestFetch);
 const text=readme?.encoding==="base64"&&typeof readme.content==="string"?
    Buffer.from(readme.content.replace(/\s/g,""),"base64").toString("utf8").slice(0,250000):"";
 // The GitHub repository itself must publish the EXACT endpoint for a true match.
 const endpoint=runtime_endpoint.replace(/\/+$/,"");
 const linked=text.split(endpoint).slice(1).some(tail=>
   tail.length===0||/^[\s)\]}>#?!'"\x60,;]/.test(tail)||
   /^\/(?:$|[\s)\]}>#?!'"\x60,;])/.test(tail));
 const now=new Date().toISOString();
 const source={verified:linked,checked_at:now,method:"github_official_repo_readme_exact_endpoint_v1",
  github_repository:record.html_url,readme_url:readme?.html_url||null,
  readme_sha:readme?.sha||null,runtime_endpoint:endpoint,
  stars:Number(record.stargazers_count||0),forks:Number(record.forks_count||0),
  pushed_at:record.pushed_at||null,archived:record.archived===true,
  license_spdx:record.license?.spdx_id||null,
  note:linked?"Upstream README publicly references the screened endpoint; deployed source remains unverified":
   "No exact screened endpoint reference found in the upstream README; no repository match claimed"};
 // Explicit maintainer-published contact in README, NOT guessed from GitHub issues being enabled.
 const line=text.split(/\r?\n/).find(row=>
   /\b(contact|support|maintainer|feedback|mailto)\b|联系|反馈/i.test(row)&&
   /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(row)&&row.length<350);
 const email=line?.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0]||null;
 const contact={verified:Boolean(email),checked_at:now,
  method:email?"explicit_published_readme_contact":"no_explicit_published_readme_contact",
  evidence_url:readme?.html_url||record.html_url,
  contact_type:email?"published_email":"not_verified",public_issues_url:record.has_issues?
  record.html_url+"/issues":null,
  note:email?"Email visibly published by repository maintainers; mailbox ownership and responsiveness untested":
    "Issues may be available but do not prove maintainer contact or verified ownership"};
 // Never store email address in a public pool response; this object is owner-only.
 if(email)contact.email=email;
 return {repository_key,repository_match_verified:linked,creator_contact_verified:Boolean(email),
  repository_match_evidence:source,creator_contact_evidence:contact};
}
