import {readFileSync,writeFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";

const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const readme=readFileSync(resolve(root,"README.md"),"utf8");
const t07=readFileSync(resolve(root,"adoption/templates/ARE-T07-maturity-assessment.md"),"utf8");
const version=readme.match(/^Version:\s*(\d+\.\d+\.\d+)/m)?.[1];
const standard=t07.match(/^\|\s*Standard version\s*\|\s*(ARE-A02@[\d.]+)\s*\|$/m)?.[1];
if(!version||!standard)throw Error("Missing canonical version in README or T07 template");
const expected=JSON.stringify({framework_version:version,assessment_standard:standard},null,2)+"\n";
const file=resolve(root,"public/are-metadata.json");
if(process.argv.includes("--check")){
  if(readFileSync(file,"utf8")!==expected)throw Error("Frontend metadata drift: run node scripts/sync-are-site-metadata.mjs");
  process.stdout.write("Frontend metadata matches canonical README and T07 template\n");
}else{
  writeFileSync(file,expected);
  process.stdout.write("Wrote "+file+"\n");
}
