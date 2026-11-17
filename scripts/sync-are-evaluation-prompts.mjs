import {readFileSync,writeFileSync} from "node:fs";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const canonical=JSON.parse(readFileSync(resolve(root,"data/are-evaluation-prompts.json"),"utf8"));
const START="<!-- ARE_PROMPT_AUTOGEN_START: run node scripts/sync-are-evaluation-prompts.mjs -->";
const END="<!-- ARE_PROMPT_AUTOGEN_END -->";
const output=new Map();
function prompt(role,lang){
 const roleSpec=canonical.roles?.[role]?.[lang];
 if(!roleSpec)throw Error("Missing canonical "+role+"/"+lang);
 const common=canonical.common?.[lang];
 if(!common||!roleSpec.lead||!roleSpec.steps?.length||!roleSpec.closing)throw Error("Incomplete "+role+"/"+lang);
 return [roleSpec.lead,
   "", common,
   "", ...roleSpec.steps.map((step,i)=>String(i+1)+". "+step),
   "",roleSpec.closing
 ].join("\n").trim()+"\n";
}
function checkRequired(content,label){
 for(const token of [
   "ARE-A02@0.5","T10","N/A{scope=","reviewed_at=YYYY-MM-DD",
   "PROVISIONAL","MATURITY_NOT_ESTABLISHED","--workspace","are_get_check",
   "are_assess_scenario","✅","❌","➖","NOT_VERIFIED","inspected","documented"
 ]){
   if(!content.includes(token))throw Error(label+": missing required "+token);
 }
 if(content.includes("are.fde.fan"))throw Error(label+": retired hostname");
}
const htmlEscape=(value)=>value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const quote=(s)=>s.trimEnd().split("\n").map(line=>line?"> "+line:">").join("\n");
function stage(path,content){output.set(path,content);}
function updateSection(path,heading,endAnchor,body){
 const src=readFileSync(resolve(root,path),"utf8");
 const h=src.indexOf(heading);
 if(h<0)throw Error(path+": missing heading");
 const after=src.indexOf("\n",h)+1;
 const footer=src.indexOf(endAnchor,after);
 if(footer<0)throw Error(path+": missing footer");
 stage(path,src.slice(0,after)+"\n"+START+"\n"+body.trimEnd()+"\n"+END+"\n\n"+src.slice(footer));
}
const targets=[
 ["docs/prompts/SELF_EVALUATE_MCP.md","## Copy this prompt into your real Agent host","For a retest after changes use","self","en"],
 ["docs/prompts/SELF_EVALUATE_MCP.zh.md","### 可复制提示词","**注意：**","self","zh"],
 ["docs/prompts/INDEPENDENT_MCP_EVALUATION.md","## Copy this prompt","Use [Self Evaluate]","independent","en"],
 ["docs/prompts/INDEPENDENT_MCP_EVALUATION.zh.md","## 可复制提示词","公共第三方评估的价值","independent","zh"],
 ["docs/prompts/MAINTAINER_RETEST_MCP.md","## Copy this prompt","[Original methodology","retest","en"],
 ["docs/prompts/MAINTAINER_RETEST_MCP.zh.md","## 可复制提示词","收到维护者复测数据后","retest","zh"]
];
for(const [path,heading,footer,role,lang] of targets){
 const content=prompt(role,lang);
 checkRequired(content,role+"/"+lang);
 updateSection(path,heading,footer,quote(content));
}
const websiteDoc=prompt("website","en");
checkRequired(websiteDoc,"website/en");
const fence=String.fromCharCode(96).repeat(3);
updateSection("docs/prompts/channels/WEBSITE_GENERAL_EVALUATION.md",
  "## Copyable general evaluation prompt","**Canonical-only policy:**",
  fence+"text\n"+websiteDoc.trimEnd()+"\n"+fence);
const homepage="public/index.html";
const homepageSrc=readFileSync(resolve(root,homepage),"utf8");
const tag=/<textarea id="evaluationPrompt"([^>]*)>[\s\S]*?<\/textarea>/;
if(!tag.test(homepageSrc))throw Error("Missing homepage prompt textarea");
stage(homepage,homepageSrc.replace(tag,(_,attrs)=>'<textarea id="evaluationPrompt"'+attrs+'>'+htmlEscape(websiteDoc.trimEnd())+'</textarea>'));
const check=process.argv.includes("--check");
for(const [path,content] of output){
 const full=resolve(root,path);
 if(check){
   if(readFileSync(full,"utf8")!==content)throw Error(path+" drift: run node scripts/sync-are-evaluation-prompts.mjs");
 }else writeFileSync(full,content);
}
process.stdout.write(check?"Checked "+output.size+" prompt copies: no drift\n":"Updated "+output.size+" prompt copies from one canonical JSON\n");
