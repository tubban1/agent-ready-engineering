import test from "node:test";
import assert from "node:assert/strict";
import {qualityAssessment,verifyRepositoryCandidate} from "./quality-screening.mjs";
import {makeHandler} from "./index.mjs";
import * as Q from "./pipeline-queries.mjs";
import {createHash} from "node:crypto";

const owner="ario_"+("Z".repeat(64));
const hash=createHash("sha256").update(owner).digest("hex");
const repo="test-org/repo";
const endpoint="https://test.example/mcp";
const validQuality={
 repository_key:repo,
 breakdown:{business_value:25,adoption:15,engineering:17,assessability:18,outreach:8},
 evidence:{urls:["https://github.com/test-org/repo","https://test.example/docs"],
  notes:"This candidate has documented, reproducible workflows and independently reviewable material."}
};
const post=(path,body,bearer)=>new Request("https://example.org"+path,{
 method:"POST",headers:{"Content-Type":"application/json",...(bearer?{Authorization:"Bearer "+bearer}:{})},
 body:JSON.stringify(body)});
test("quality rubric is independently stored, totals server-side and requires evidence",()=>{
 const x=qualityAssessment(validQuality);
 assert.equal(x.score,83);
 assert.equal(x.evidence.rubric,"are.candidate-quality.v1");
 assert.throws(()=>qualityAssessment({...validQuality,breakdown:{...validQuality.breakdown,business_value:31}}),/invalid_quality_score/);
 assert.throws(()=>qualityAssessment({...validQuality,evidence:{urls:[],notes:"missing"}}),/quality_evidence_required/);
 assert.throws(()=>qualityAssessment({...validQuality,breakdown:{...validQuality.breakdown,developer_hype:90}}),/invalid_quality_assessment/);
});
test("GitHub published endpoint is verified with a fixed API hostname; issues alone never verify contact",async()=>{
 const fetchMock=async url=>{
  if(url=== "https://api.github.com/repos/test-org/repo")return {status:200,json:async()=>({
    full_name:repo,html_url:"https://github.com/test-org/repo",archived:false,private:false,has_issues:true,
    stargazers_count:123,forks_count:9,pushed_at:"2026-11-19T00:00:00Z",license:{spdx_id:"MIT"}})};
  if(url.endsWith("/readme"))return {status:200,json:async()=>({
    encoding:"base64",sha:"abc",html_url:"https://github.com/test-org/repo/blob/main/README.md",
    content:Buffer.from("Live MCP endpoint: "+endpoint).toString("base64")})};
  throw Error("Unexpected outbound request");
 };
 const value=await verifyRepositoryCandidate(repo,endpoint,fetchMock);
 assert.equal(value.repository_match_verified,true);
 assert.equal(value.creator_contact_verified,false);
 assert.equal(value.repository_match_evidence.stars,123);
 assert.match(value.repository_match_evidence.note,/deployed source remains unverified/);
 assert.equal(value.creator_contact_evidence.contact_type,"not_verified");
});
test("A prefix of a different MCP path cannot pass exact endpoint screening",async()=>{
 const response=async url=>({status:200,json:async()=>url.endsWith("/readme")?
  {encoding:"base64",content:Buffer.from("MCP URL: https://test.example/mcp-unrelated").toString("base64")}:
  {full_name:repo,archived:false,private:false}});
 const r=await verifyRepositoryCandidate(repo,endpoint,response);
 assert.equal(r.repository_match_verified,false);
});
test("Mismatch never becomes verified; explicitly published contact has source evidence",async()=>{
 const fetchMock=async url=>({status:200,json:async()=>url.endsWith("/readme")?
  {encoding:"base64",content:Buffer.from("Contact maintainers: hello@example.org\nMCP: https://wrong.example/mcp").toString("base64"),
   html_url:"https://github.com/test-org/repo/blob/main/README.md"}:
  {full_name:repo,html_url:"https://github.com/test-org/repo",has_issues:true,archived:false,private:false}});
 const result=await verifyRepositoryCandidate(repo,endpoint,fetchMock);
 assert.equal(result.repository_match_verified,false);
 assert.equal(result.creator_contact_verified,true);
 assert.equal(result.creator_contact_evidence.email,"hello@example.org");
 await assert.rejects(verifyRepositoryCandidate("evil.local/../../../secrets",endpoint,fetchMock),/invalid_screening_target/);
});
test("Owner-only verification and scoring routes do not permit forged verification booleans",async()=>{
 let calls=[];
 const sql=async(query,params)=>{
  calls.push({query,params});
  if(query===Q.SCREEN_TARGET)return {repository_key:repo,runtime_endpoint:endpoint};
  if(query===Q.SCREEN_SAVE)return {repository_key:repo,repository_match_verified:true,creator_contact_verified:false};
  if(query===Q.QUALITY_SAVE)return {repository_key:repo,quality_score:83};
  throw Error("Unexpected database operation");
 };
 const repoVerify=async(r,e)=>{
  assert.equal(r,repo);assert.equal(e,endpoint);
  return {repository_match_verified:true,creator_contact_verified:false,
   repository_match_evidence:{method:"trusted"},creator_contact_evidence:{method:"no_contact"}};
 };
 const api=makeHandler({env:{ARE_INTAKE_OWNER_HASH:hash},sql,repoVerify});
 assert.equal((await api(post("/v3/pool/verify",{repository_key:repo}))).status,401);
 assert.equal((await api(post("/v3/pool/quality",validQuality))).status,401);
 assert.equal((await api(post("/v3/pool/verify",{repository_key:repo,repository_match_verified:true},owner))).status,400);
 const vr=await api(post("/v3/pool/verify",{repository_key:repo},owner));
 assert.equal(vr.status,200);
 assert.equal((await vr.json()).screening.creator_contact_verified,false);
 const qr=await api(post("/v3/pool/quality",validQuality,owner));
 assert.equal(qr.status,200);
 assert.equal(calls.find(x=>x.query===Q.QUALITY_SAVE).params[1],83);
 assert.match(Q.FILTER,/quality_score>=75/);
 assert.match(Q.FILTER,/repository_match_verified/);
 assert.match(Q.ISSUE,/quality_score>=75/);
 assert.match(Q.PUBLIC_CLAIM,/quality_score>=75/);
 assert.match(Q.PUBLIC_POOL,/quality_score>=75/);
 assert.doesNotMatch(Q.PUBLIC_POOL,/repository_match_evidence|creator_contact_evidence/);
});
