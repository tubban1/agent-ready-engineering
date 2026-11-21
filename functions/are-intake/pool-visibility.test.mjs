import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {POOL} from "./pipeline-queries.mjs";
import {pipelinePage} from "./pipeline-page.mjs";

test("Owner pool pages across the 500 new source-observed candidates without confusing observed tool counts with quality-approval",()=>{
 assert.match(POOL,/LIMIT 1500/);
 assert.match(POOL,/c\.observed_tool_count/);
 assert.match(POOL,/c\.stage/);
 assert.match(POOL,/c\.source_probe_checked_at/);
 assert.match(POOL,/c\.repository_match_verified/);
 const html=pipelinePage();
 const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(js);
 new vm.Script(js);
 assert.match(js,/已实测/);
 assert.match(js,/暂不满足准入门槛/);
 assert.match(js,/p\.observed_tool_count/);
 assert.match(js,/p\.repository_match_verified&&Number\(p\.quality_score\)>=75/);
 assert.doesNotMatch(js,/否则须先取得用户在 ARE 页面批准/);
});
