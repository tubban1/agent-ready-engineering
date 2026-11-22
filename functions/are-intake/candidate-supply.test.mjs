import test from "node:test";
import assert from "node:assert/strict";
import {documentedEndpoints,objectiveScreen,replenishQualifiedPool,
 SUPPLY_LEASE_SQL,SUPPLY_PICK_SQL,SUPPLY_SAVE_SQL,SUPPLY_IMPORT_SQL,SUPPLY_STATUS_SQL,
 SUPPLY_DISCOVERY_CURSOR_SQL,SUPPLY_ADVANCE_DISCOVERY_SQL} from "./candidate-supply.mjs";
import {TASK_SUBMIT_SQL} from "./task-service.mjs";
const active={full_name:"project-tools/active-mcp",description:"Public analytical data integration for agent assessment, with verified documented tools",
 stargazers_count:45,forks_count:4,pushed_at:new Date().toISOString(),archived:false,private:false,has_issues:true,
 html_url:"https://github.com/project-tools/active-mcp",owner:{type:"Organization"},
 license:{spdx_id:"MIT"}};
const readme="## Features\n## Usage\n## Tools\n## Examples\nRemote endpoint: https://public-service.example/mcp\nContact: support@project.example";
const readmeInfo={encoding:"base64",sha:"0123456789",html_url:"https://github.com/project-tools/active-mcp/blob/main/README.md",
 content:Buffer.from(readme).toString("base64")};
function fakeFetch(url){
 if(!url.startsWith("https://api.github.com/"))throw Error("MUST NEVER FETCH UNTRUSTED ENDPOINT");
 const record=url.endsWith("/readme")?readmeInfo:active;
 return Promise.resolve({ok:true,status:200,json:async()=>record});
}
test("Source extraction rejects registry, badge, localhost, credential-bearing URLs",()=>{
 const text="Live https://public-service.example/mcp and local http://127.0.0.1/mcp "+
  "docs https://registry.modelcontextprotocol.io/v0.1/servers?search=abc/mcp "+
  "private https://localhost/mcp and fake https://user:pass@host.com/mcp "+
  "bad https://example.org:8443/mcp";
 assert.deepEqual(documentedEndpoints(text),["https://public-service.example/mcp"]);
});
test("README fenced or inline code URLs are parsed as exact public MCP endpoints, not as URLs ending in a backtick",()=>{
 const text="Hosted: \`https://mcp.open-example.org/mcp\`\n"+
  "Fenced:\n\`\`\`\nhttps://mcp.bare-example.org/mcp\n\`\`\`";
 assert.deepEqual(documentedEndpoints(text),[
  "https://mcp.open-example.org/mcp","https://mcp.bare-example.org/mcp"
 ]);
});
test("Quality requires real public repository, source binding, freshness and actual observed inventory",()=>{
 const best=objectiveScreen({repo:active,readme,endpoint:"https://public-service.example/mcp",
  observedTools:18,verified:true,contact:true});
 assert.ok(best.score>=75);
 assert.equal(best.eligible,true);
 assert.equal(objectiveScreen({...{repo:active,readme,endpoint:"https://public-service.example/mcp",
  observedTools:0,verified:true,contact:true}}).eligible,false);
 assert.equal(objectiveScreen({repo:active,readme,endpoint:"https://public-service.example/mcp",
  observedTools:18,verified:false,contact:true}).eligible,false);
 assert.equal(objectiveScreen({repo:{...active,pushed_at:"2020-01-01T00:00:00Z"},
  readme,endpoint:"https://public-service.example/mcp",observedTools:18,verified:true,contact:true}).eligible,false);
});
test("Automatic refill never invents a quality score: GitHub official docs and preobserved tool inventory",async()=>{
 const calls=[];
 const sql=async(query,args)=>{
  calls.push({query,args});
  if(query===SUPPLY_LEASE_SQL)return {id:1};
  if(query===SUPPLY_PICK_SQL)return {rows:[{repository_key:active.full_name,display_name:"Active",
    observed_tool_count:18,tool_count:18}]};
  if(query===SUPPLY_SAVE_SQL)return {repository_key:args[0],decision:args[5],quality_score:args[10]};
  if(query===SUPPLY_STATUS_SQL)return {last_finished_at:"2026-11-21T14:00:00Z"};
  throw Error("Unexpected SQL");
 };
 const result=await replenishQualifiedPool(sql,{fetchImpl:fakeFetch});
 assert.equal(result.qualified,1);
 assert.equal(result.errors,0);
 const saved=calls.find(c=>c.query===SUPPLY_SAVE_SQL);
 assert.equal(saved.args[5],"ELIGIBLE");
 assert.ok(saved.args[10]>=75);
 assert.equal(saved.args[1],true);
 assert.equal(saved.args[8],"https://public-service.example/mcp");
 assert.equal(JSON.parse(saved.args[12]).rubric,"are.automated-source-signal.v1");
 assert.equal(JSON.parse(saved.args[12]).provisional,true);
 assert.match(SUPPLY_SAVE_SQL,/ON CONFLICT\(cohort_id,repository_key\) DO NOTHING/);
});
test("Rate limiter skips duplicate scans and empty inventory discovers new repos as unverified only",async()=>{
 let fetched=0;
 const skipped=await replenishQualifiedPool(async q=>q===SUPPLY_LEASE_SQL?null:null,
  {fetchImpl:async()=>{fetched++;throw Error("no fetch")}});
 assert.equal(skipped.skipped,"cooldown");
 assert.equal(fetched,0);
 const calls=[];
 const sql=async(q,args)=>{
  calls.push([q,args]);
  if(q===SUPPLY_LEASE_SQL)return {id:1};
  if(q===SUPPLY_PICK_SQL)return {rows:[]};
  if(q===SUPPLY_DISCOVERY_CURSOR_SQL)return {page:4,query_index:1};
  if(q===SUPPLY_ADVANCE_DISCOVERY_SQL)return {discovery_page:5,discovery_query_index:1};
  if(q===SUPPLY_IMPORT_SQL)return {repository_key:args[0]};
  if(q===SUPPLY_STATUS_SQL)return {};
  throw Error("SQL unexpected");
 };
 const fetchImpl=async url=>{
  assert.ok(url.startsWith("https://api.github.com/search/"),url);
  assert.ok(url.includes("page=4")&&url.includes("per_page=40"),url);
  return {status:200,ok:true,json:async()=>({items:[
   {full_name:"another-group/new-mcp-server",archived:false,private:false,
    name:"new-mcp-server",owner:{login:"another-group"},description:"Demo registry candidate, unverified"}
  ]})};
 };
 const r=await replenishQualifiedPool(sql,{fetchImpl});
 assert.equal(r.imported,1);
 assert.equal(calls.some(x=>x[0]===SUPPLY_SAVE_SQL),false);
 assert.match(SUPPLY_IMPORT_SQL,/github_discovered_unverified/);
 assert.ok(calls.some(x=>x[0]===SUPPLY_ADVANCE_DISCOVERY_SQL));
});
test("The one formal submission SQL finalizes and closes a Token atomically",()=>{
 for(const snippet of ["private_task_finalizations","FOR UPDATE OF t","private_task_submissions previous",
 "ON CONFLICT (task_id) DO NOTHING","closed AS (","SET revoked_at=now()",
 "JOIN closed done"])assert.ok(TASK_SUBMIT_SQL.includes(snippet),snippet);
 assert.doesNotMatch(TASK_SUBMIT_SQL,/COUNT\(\*\).*<25/);
});
