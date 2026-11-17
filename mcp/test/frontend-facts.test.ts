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
  assert.match(read("public/evaluations/app.js"),/getJSON\("\/are-metadata\.json"\)/);
});
test("latest public checked_at date is calculated dynamically, and local research is filtered",async()=>{
  const source=read("public/evaluations/app.js");
  const index=read("public/evaluations/index.html");
  assert.ok(!source.includes("todayCount"));
  assert.match(index,/data-i18n="recentGroup"/);
  const elements=new Map<string,any>();
  const getElementById=(id:string)=>{
    if(!elements.has(id))elements.set(id,{
      textContent:"",innerHTML:"",value:"",hidden:false,placeholder:"",dataset:{},
      classList:{remove(){},add(){},toggle(){}},style:{},setAttribute(){},
      addEventListener(){},querySelectorAll(){return[];},showModal(){},close(){},
      scrollIntoView(){}
    });
    return elements.get(id);
  };
  const item=(project_key:string,checked_at:string,source_kind="github_public")=>({
    project_key,display_name:project_key,category:"MCP",status:"preliminary",
    source_kind,repo_url:"https://github.com/test/"+project_key,
    checked_at,publication:"directory_only",summary:"private narrative not published",
    findings:[],strengths:[],evidence:[]
  });
  const items=[
    item("a","2026-11-15T09:00:00Z"),
    item("b","2026-11-15T10:00:00Z"),
    item("c","2026-11-16T10:00:00Z"),
    item("private","2026-11-17T10:00:00Z","local_repo")
  ];
  const fetch=async(url:string)=>({
    ok:true,json:async()=>{
      if(url.includes("v1/portfolio"))return {assessments:items,batches:[]};
      if(url.includes("/v2/overview"))return {recent:[]};
      return {framework_version:"0.19.0"};
    }
  });
  const document={getElementById,documentElement:{lang:"en"},querySelectorAll(){return[];}};
  const location={search:"",href:"https://are.world2.co/evaluations/",pathname:"/evaluations/",hash:""};
  const history={replaceState(){}};
  const window={ARE_ZH:{}};
  runInNewContext(source,{document,fetch,console,Intl,Date,Number,String,Array,Math,Set,
    encodeURIComponent,URL,URLSearchParams,location,history,window,navigator:{clipboard:{writeText(){}}}});
  await new Promise(resolve=>setTimeout(resolve,70));
  assert.equal(getElementById("totalCount").textContent,"3","local project must be excluded even with stale API");
  assert.match(getElementById("latestDateLabel").textContent,/2026-11-16/);
  assert.match(getElementById("latestHint").textContent,/1/);
  assert.equal(getElementById("frameworkVersion").textContent,"v0.19.0");
});
