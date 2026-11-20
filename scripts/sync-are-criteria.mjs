// Generated criteria are the only definitions served to agents; fail CI on drift.
import {readFileSync,writeFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve,dirname} from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const criteria=JSON.parse(readFileSync(resolve(root,"data/are-assessment-criteria-pilot.v1.json"),"utf8"));
const protocols=JSON.parse(readFileSync(resolve(root,"data/are-criteria-test-protocols.v1.json"),"utf8"));
if(criteria.version!=="0.2.0-pilot-v5.1"||protocols.version!=="pilot-2026-11-21")throw Error("Wrong V5.1 criteria version");
const expected=new Set(criteria.criteria.map(c=>c.id));
if(expected.size!==55||new Set(Object.keys(protocols.protocols)).size!==55)throw Error("Expected 55 unique criteria and protocols");
const rows=criteria.criteria.filter(c=>c.side==="product").map(c=>{
 if(!protocols.protocols[c.id]||!c.evidence_basis)throw Error("Missing V5.1 protocol or evidence basis: "+c.id);
 const {id,legacy_id,obligation,applies_when,pass_if,evidence_basis}=c;
 const reference_details=evidence_basis.source_ids.map(source_id=>({id:source_id,...criteria.evidence_catalog.sources[source_id]}));
 return {id,legacy_id,obligation,applies_when,pass_if,evidence_basis,reference_details,...protocols.protocols[id]};
});
if(rows.length!==32)throw Error("Expected 32 product criteria");
const out="// Generated from canonical V5.1 criteria/protocols; do not edit manually.\n"+
  "export const TASK_CRITERIA = Object.freeze("+JSON.stringify(rows)+");\n";
const target=resolve(root,"functions/are-intake/criteria-compact.mjs");
if(process.argv.includes("--check")){
 if(readFileSync(target,"utf8")!==out)throw Error("Criteria drift; run node scripts/sync-are-criteria.mjs");
 console.log("V5.1 compact criteria synchronized:",rows.length);
}else{
 writeFileSync(target,out);
 console.log("Generated V5.1 compact criteria:",rows.length);
}
