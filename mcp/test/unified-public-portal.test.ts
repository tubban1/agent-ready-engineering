import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {runInNewContext} from "node:vm";
const root=resolve(fileURLToPath(new URL("../..",import.meta.url)));
const source=(path:string)=>readFileSync(resolve(root,path),"utf8");

test("unified public portal defaults to English and supports complete Chinese UI",()=>{
 const page=source("public/evaluations/index.html");
 const script=source("public/evaluations/i18n.js");
 const context={window:{} as {ARE_ZH?:Record<string,string>}};
 runInNewContext(script,context);
 assert.equal(page.match(/<html lang="en">/)?.length,1);
 assert.match(page,/id="enButton"/);
 assert.match(page,/id="zhButton"/);
 const keys=[...page.matchAll(/data-i18n="([^"]+)"/g)].map(x=>x[1]);
 const missing=[...new Set(keys)].filter(k=>!(context.window.ARE_ZH||{})[k!]);
 assert.deepEqual(missing,[],"Chinese must cover every visible static UI label");
 assert.match(source("public/evaluations/app.js"),/new URLSearchParams\(location.search\)/);
 assert.match(source("public/evaluations/app.js"),/window\.ARE_ZH/);
 assert.ok(source("public/evaluations/unified.css").includes("@media(max-width:1000px){.shell{grid-template-columns:minmax(0,1fr)}"),"mobile shell must not expand to table intrinsic width");
});
test("unified UI retains all self-service operations and does not expose unpublished data",()=>{
 const html=source("public/evaluations/index.html");
 const js=source("public/evaluations/app.js");
 const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(x=>x[1]));
 const requested=[...js.matchAll(/\$\("([^"]+)"\)/g)].map(x=>x[1]);
 assert.deepEqual([...new Set(requested)].filter(k=>!ids.has(k)),[],"JS must not use missing IDs");
 for(const path of ["/v2/submit","/v2/claim/start","/v2/claim/verify","/v2/reassess","/v2/publish","/v2/history","/v2/evidence","/v2/report"]){
  assert.ok(js.includes(path),"missing preserved owner operation "+path);
 }
 assert.match(js,/filter\(recordIsPublic\)/);
 assert.doesNotMatch(js,/evaluations\/seed\.json/);
 assert.equal(existsSync(resolve(root,"public/evaluations/seed.json")),false,"Remove unpublished local-research fallback from public deployment");
 assert.doesNotMatch(html,/batchGrid|batchProgress|batchDone/);
 assert.match(html,/id="submitForm"/);
 assert.match(html,/id="detailDialog"/);
});
test("old benchmark links redirect to unified portal without deleting creator report query params",()=>{
 const config=JSON.parse(source("vercel.json"));
 for(const path of ["/benchmark","/benchmark/"]){
  const rule=config.redirects.find((r:{source:string;has?:unknown})=>r.source===path&&!r.has);
  assert.ok(rule,path);
  assert.equal(rule.destination,"/evaluations/");
  assert.equal(rule.permanent,true);
 }
 assert.match(source("public/index.html"),/href="\/evaluations\/#preflight"/);
});
test("publication projection excludes internal local projects, batches and unreviewed narratives",()=>{
 const sql=source("functions/are-reports/index.mjs");
 assert.match(sql,/WHERE source_kind='github_public'/);
 assert.match(sql,/THEN 'published_case' ELSE 'directory_only'/);
 assert.match(sql,/THEN findings ELSE '\[\]'::jsonb/);
 assert.match(sql,/THEN evidence ELSE '\[\]'::jsonb/);
 assert.match(sql,/'internal_batches_exposed',false/);
 assert.doesNotMatch(sql,/FROM are_eval\.batches/);
});
