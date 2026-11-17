import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {loadFramework} from "../src/data.js";
import {parseAssessment} from "../src/assessment.js";

const root=resolve(fileURLToPath(new URL("../..",import.meta.url)));
const read=(name:string)=>readFileSync(resolve(root,name),"utf8");
const source=JSON.parse(read("data/are-evaluation-prompts.json"));
const generated=[
  "public/index.html",
  "docs/prompts/channels/WEBSITE_GENERAL_EVALUATION.md",
  "docs/prompts/SELF_EVALUATE_MCP.md",
  "docs/prompts/SELF_EVALUATE_MCP.zh.md",
  "docs/prompts/INDEPENDENT_MCP_EVALUATION.md",
  "docs/prompts/INDEPENDENT_MCP_EVALUATION.zh.md",
  "docs/prompts/MAINTAINER_RETEST_MCP.md",
  "docs/prompts/MAINTAINER_RETEST_MCP.zh.md"
];
const requirements=[
  "ARE-A02@0.5","T10","N/A{scope=","reviewed_at=YYYY-MM-DD",
  "PROVISIONAL","MATURITY_NOT_ESTABLISHED","--workspace","are_get_check",
  "are_assess_scenario","✅","❌","➖","NOT_VERIFIED","inspected","documented"
];

test("all eight copies match the single source, not independent hand edits",()=>{
 const out=spawnSync(process.execPath,["scripts/sync-are-evaluation-prompts.mjs","--check"],
   {cwd:root,encoding:"utf8"});
 assert.equal(out.status,0,(out.stdout||"")+(out.stderr||""));
 assert.deepEqual(Object.keys(source.roles).sort(),["independent","retest","self","website"]);
});
test("every generated prompt includes A02 v0.5, T10, scoped N/A fields and capability boundaries",()=>{
 for(const path of generated){
   const data=read(path);
   for(const token of requirements)assert.ok(data.includes(token),path+": missing "+token);
 }
});
test("homepage and website reference are both generated from the canonical prompt",()=>{
 const html=read("public/index.html");
 assert.match(html,/<textarea id="evaluationPrompt"/);
 assert.match(html,/Public ARE MCP|public ARE MCP/);
 assert.match(html,/MATURITY_NOT_ESTABLISHED/);
 assert.match(read("docs/prompts/channels/WEBSITE_GENERAL_EVALUATION.md"),/ARE_PROMPT_AUTOGEN_START/);
 assert.ok(!source.common.en.includes("are.fde.fan"));
});
test("local validation tools are not falsely promised by the public MCP entry",()=>{
 for(const path of generated){
   const data=read(path);
   assert.match(data,/--workspace/);
   assert.match(data,/are_get_check/);
   assert.match(data,/are_assess_scenario/);
   assert.match(data,/NOT_VERIFIED|NOT_TESTED/);
 }
});

test("prompt T07 instructions match validator result values and do not claim a confirmed failure when unverified",()=>{
  for(const path of generated){
    const data=read(path);
    assert.match(data,/Result|Result 列/);
    assert.match(data,/NOT_VERIFIED.{0,45}❌/s,path+": no NOT_VERIFIED mapping");
    assert.match(data,/证据|evidence/);
  }
  const commonEn=source.common.en;
  const commonZh=source.common.zh;
  assert.match(commonEn,/Result column accepts only ✅ \/ ❌ \/ ➖/);
  assert.match(commonZh,/Result 列中，只允许填写 ✅ \/ ❌ \/ ➖/);
  assert.match(commonEn,/not a confirmed product defect/);
  assert.match(commonZh,/不表示已确认产品缺陷/);
  assert.match(source.roles.website.en.steps[0],/continue only in the permitted public read-only route/);
  assert.doesNotMatch(source.roles.website.en.steps[0],/Stop if authorization is unavailable/);
});

test("T07's actual machine parser accepts emoji result states, not prose status values",()=>{
  const allowed=loadFramework().values.check_result;
  assert.deepEqual([...allowed],["✅","❌","➖"]);
  const rows=["✅","❌","➖","NOT_VERIFIED"].map(result=>
    "| L1-V1 | value | "+result+" | inspected | evidence/check.md |");
  for(let i=0;i<rows.length;i++){
    const parsed=parseAssessment(rows[i]!);
    assert.equal(parsed.rows[0]?.result,["✅","❌","➖","NOT_VERIFIED"][i]);
    assert.equal(allowed.includes(parsed.rows[0]!.result),i<3);
  }
});
