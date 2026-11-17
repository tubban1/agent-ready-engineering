import test from "node:test";
import assert from "node:assert/strict";
import score from "./are-score/index.mjs";
import reports from "./are-reports/index.mjs";

const canonical="https://are.world2.co";
const allowed=[canonical];
const disallowed=["https://are.fde.fan","https://agent-ready-engineering.vercel.app","https://evil.are.world2.co","https://are.world2.co.attacker.example","http://are.world2.co","https://world2.co","null"];

for(const [name,service,url] of [
  ["Benchmark API",score,"https://are-score.example/v2/health"],
  ["Portfolio API",reports,"https://are-reports.example/v1/portfolio"]
]){
 for(const origin of allowed){
  test(name+" OPTIONS accepts trusted origin "+origin,async()=>{
   const request=new Request(url,{method:"OPTIONS",headers:{Origin:origin}});
   const response=await service.fetch(request);
   assert.equal(response.status,204);
   assert.equal(response.headers.get("Access-Control-Allow-Origin"),origin);
   assert.ok(response.headers.get("Vary")==="Origin"||name==="Benchmark API");
   assert.ok(response.headers.get("Access-Control-Allow-Methods")?.includes("GET"));
  });
 }
 for(const origin of disallowed){
  test(name+" OPTIONS denies unknown origin "+origin,async()=>{
   const response=await service.fetch(new Request(url,{method:"OPTIONS",headers:{Origin:origin}}));
   assert.equal(response.status,204);
   assert.equal(response.headers.get("Access-Control-Allow-Origin"),null);
  });
 }
}
test("Benchmark health GET includes canonical origin and does not expose arbitrary origins",async()=>{
 const good=await score.fetch(new Request("https://are-score.example/v2/health",{headers:{Origin:canonical}}));
 assert.equal(good.status,200);
 assert.equal(good.headers.get("Access-Control-Allow-Origin"),canonical);
 const bad=await score.fetch(new Request("https://are-score.example/v2/health",{headers:{Origin:"https://attacker.example"}}));
 assert.equal(bad.status,200);
 assert.equal(bad.headers.get("Access-Control-Allow-Origin"),null);
});
