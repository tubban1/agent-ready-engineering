import {test} from "node:test";
import assert from "node:assert/strict";
import portfolio,{PUBLIC_PORTFOLIO_SQL} from "./index.mjs";
test("public API only selects public GitHub metadata and one explicit case",()=>{
 assert.match(PUBLIC_PORTFOLIO_SQL,/WHERE source_kind='github_public'/);
 assert.match(PUBLIC_PORTFOLIO_SQL,/project_key='mcp\/solarstorm.today'/);
 assert.match(PUBLIC_PORTFOLIO_SQL,/directory_only/);
 assert.match(PUBLIC_PORTFOLIO_SQL,/THEN 'published_case'/);
 assert.match(PUBLIC_PORTFOLIO_SQL,/ELSE '\[\]'::jsonb END AS findings/);
 assert.match(PUBLIC_PORTFOLIO_SQL,/ELSE '\[\]'::jsonb END AS evidence/);
 assert.match(PUBLIC_PORTFOLIO_SQL,/ELSE NULL END AS source_ref/);
 assert.match(PUBLIC_PORTFOLIO_SQL,/'batches','\[\]'::json/);
 assert.doesNotMatch(PUBLIC_PORTFOLIO_SQL,/FROM are_eval\.batches|local_repo|benchmark_submission_events/);
});
test("public API refuses writes and only allows exact World2 origin",async()=>{
 const url="https://are-eval.example/v1/portfolio";
 for(const origin of ["https://are.world2.co","https://are.fde.fan"]){
  const r=await portfolio.fetch(new Request(url,{method:"POST",headers:{Origin:origin}}));
  assert.equal(r.status,405);
  assert.equal(r.headers.get("Access-Control-Allow-Origin"),origin==="https://are.world2.co"?origin:null);
 }
});
