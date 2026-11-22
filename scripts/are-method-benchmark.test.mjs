import test from "node:test";
import assert from "node:assert/strict";
import {evaluateAREMethod} from "./are-method-benchmark.mjs";
test("No frozen independent expert evidence means NOT YET VALIDATED",()=>{
 const x=evaluateAREMethod({cases:[]});
 assert.equal(x.status,"NOT_YET_VALIDATED");
 assert.equal(x.gates.independent_projects,false);
});
test("Self-claimed perfect tiny run cannot masquerade as validated method",()=>{
 const x=evaluateAREMethod({frozen_contract_sha:"a".repeat(40),holdout_frozen_at:"2026-11-20T00:00:00Z",
  cases:[{project:"test/a",agent:"agent1",round:1,stratum:"oauth_remote",gold:"INVALID",
   verdict:"REJECT",critical:true,human_reviews:["INVALID","INVALID"],source_evidence:"host-event/1"}]});
 assert.equal(x.status,"NOT_YET_VALIDATED");
 assert.equal(x.cases,1);
 assert.equal(x.gates.minimum_cases,false);
});
test("Known false acceptance is tracked even when the benchmark has unobserved cases",()=>{
 const x=evaluateAREMethod({cases:[{project:"test/a",agent:"agent1",round:1,stratum:"api_key_remote",gold:"INVALID",
  verdict:"ACCEPT",critical:true,human_reviews:["INVALID","INVALID"],source_evidence:"host-event/1"}]});
 assert.equal(x.critical_false_accepts,1);
 assert.equal(x.verdicts.invalid_accepted,1);
 assert.equal(x.gates.no_critical_false_accepts,false);
});
