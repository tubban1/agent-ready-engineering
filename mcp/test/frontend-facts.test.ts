import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {runInNewContext} from "node:vm";

const root=resolve(fileURLToPath(new URL("../..",import.meta.url)));
const read=(path:string)=>readFileSync(resolve(root,path),"utf8");

test("public ARE landing shows only the canonical endpoint and no compatibility advice",()=>{
  const html=read("public/index.html");
  assert.ok(html.includes("https://are.world2.co/mcp"));
  assert.ok(!html.includes("are.fde.fan"));
  assert.match(html,/POST redirects/);
});
test("framework metadata derives from README and canonical T07; no hand-edited static version",()=>{
  const meta=JSON.parse(read("public/are-metadata.json"));
  const framework=read("README.md").match(/^Version:\s*(\d+\.\d+\.\d+)/m)?.[1];
  const standard=read("adoption/templates/ARE-T07-maturity-assessment.md")
    .match(/^\|\s*Standard version\s*\|\s*(ARE-A02@[\d.]+)\s*\|$/m)?.[1];
  assert.equal(meta.framework_version,framework);
  assert.equal(meta.assessment_standard,standard);
  assert.ok(!read("public/evaluations/index.html").includes("v0.18"));
  assert.match(read("public/evaluations/app.js"),/fetch\('\/are-metadata\.json'/);
});
test("latest Swiss checked_at day is displayed, not fixed 2026-11-15 'today'",async()=>{
  const source=read("public/evaluations/app.js");
  const index=read("public/evaluations/index.html");
  assert.ok(!source.includes("todayCount"));
  assert.match(index,/最近更新日期的记录/);
  assert.doesNotMatch(index,/今日新分析/);
  const elements=new Map<string,any>();
  const getElementById=(id:string)=>{
    if(!elements.has(id)){
      elements.set(id,{
        textContent:"",innerHTML:"",value:"",style:{},classList:{remove(){},add(){}},
        firstElementChild:{style:{}},addEventListener(){},querySelectorAll(){return[];},showModal(){},close(){}
      });
    }
    return elements.get(id);
  };
  const items=[
    {project_key:"a",display_name:"a",category:"MCP",status:"preliminary",summary:"a",checked_at:"2026-11-15T09:00:00Z"},
    {project_key:"b",display_name:"b",category:"MCP",status:"preliminary",summary:"b",checked_at:"2026-11-15T10:00:00Z"},
    {project_key:"c",display_name:"c",category:"MCP",status:"source_review",summary:"c",checked_at:"2026-11-16T10:00:00Z"}
  ];
  const responses={
    '/are-metadata.json':{framework_version:"0.19.0"},
    'portfolio':{assessments:items,batches:[]}
  };
  const fetch=async(url:string)=>({ok:true,json:async()=>url.includes('portfolio')?responses.portfolio:responses['/are-metadata.json']});
  runInNewContext(source,{document:{getElementById},fetch,console,Intl,Date,Number,String,Array,Math,Set,encodeURIComponent});
  await new Promise(resolve=>setTimeout(resolve,35));
  assert.equal(getElementById("latestCount").textContent,"1");
  assert.match(getElementById("latestHint").textContent,/2026-11-16/);
  assert.match(getElementById("latestDateLabel").textContent,/2026-11-16/);
  assert.equal(getElementById("frameworkVersion").textContent,"v0.19.0");
});
