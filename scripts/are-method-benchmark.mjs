import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";

// Evidence benchmark, not a self-score. Input MUST be a previously frozen,
// human-reviewed independent holdout set that ARE did not train its gates on.
const groups=["anonymous_remote","oauth_remote","api_key_remote","local_stdio"];
const div=(a,b)=>b?a/b:0;
export function evaluateAREMethod(data){
 const cases=Array.isArray(data?.cases)?data.cases:[];
 const projectSet=new Set(cases.map(x=>x.project));
 const agentSet=new Set(cases.map(x=>x.agent));
 const labels=new Map(),outcomes={invalid_rejected:0,invalid_accepted:0,valid_rejected:0,valid_accepted:0};
 let humanAgreements=0,humanPaired=0,criticalFalseAccepts=0,unreviewed=0;
 const repeats=new Map();
 for(const item of cases){
  const valid=["VALID","INVALID"].includes(item.gold)&&["ACCEPT","REJECT"].includes(item.verdict)&&
   groups.includes(item.stratum)&&item.source_evidence&&
   Array.isArray(item.human_reviews)&&item.human_reviews.length>=2&&
   item.human_reviews.every(x=>["VALID","INVALID"].includes(x));
  if(!valid){unreviewed++;continue;}
  const verdict=item.gold==="INVALID"?(item.verdict==="REJECT"?"invalid_rejected":"invalid_accepted"):
    (item.verdict==="REJECT"?"valid_rejected":"valid_accepted");
  outcomes[verdict]++;
  if(verdict==="invalid_accepted"&&item.critical===true)criticalFalseAccepts++;
  humanPaired++;if(item.human_reviews[0]===item.human_reviews[1])humanAgreements++;
  const key=item.project+"|"+item.agent;
  if(!repeats.has(key))repeats.set(key,[]);
  repeats.get(key).push(item);
  if(!labels.has(item.stratum))labels.set(item.stratum,new Set());
  labels.get(item.stratum).add(item.project);
 }
 let pairs=0,consistent=0;
 for(const items of repeats.values()){
  const distinctRounds=new Map(items.map(x=>[x.round,x]));
  if(distinctRounds.has(1)&&distinctRounds.has(2)){
   pairs++;if(distinctRounds.get(1).verdict===distinctRounds.get(2).verdict)consistent++;
  }
 }
 const total=cases.length,expectedPairs=projectSet.size*agentSet.size;
 const scores={
  false_accept_rate:div(outcomes.invalid_accepted,outcomes.invalid_accepted+outcomes.invalid_rejected),
  false_reject_rate:div(outcomes.valid_rejected,outcomes.valid_rejected+outcomes.valid_accepted),
  invalid_recall:div(outcomes.invalid_rejected,outcomes.invalid_accepted+outcomes.invalid_rejected),
  repeat_agreement:div(consistent,pairs),
  human_agreement:div(humanAgreements,humanPaired),
 };
 const gates={
  frozen_contract:typeof data?.frozen_contract_sha==="string"&&/^[a-f0-9]{40}$/.test(data.frozen_contract_sha)&&
   typeof data?.holdout_frozen_at==="string"&&!Number.isNaN(Date.parse(data.holdout_frozen_at)),
  independent_projects:projectSet.size>=60,
  agents:agentSet.size>=3,
  complete_two_rounds:pairs>=expectedPairs&&expectedPairs>=180,
  four_ingress_types:groups.every(s=>(labels.get(s)?.size||0)>=10),
  minimum_cases:total>=360,
  human_gold_provenance:unreviewed===0&&total>0&&scores.human_agreement>=0.90,
  no_critical_false_accepts:total>0&&criticalFalseAccepts===0,
  detection_recall:outcomes.invalid_rejected+outcomes.invalid_accepted>=60&&scores.invalid_recall>=0.95,
  false_rejects:outcomes.valid_rejected+outcomes.valid_accepted>=60&&scores.false_reject_rate<=0.05,
  repeatability:pairs>=180&&scores.repeat_agreement>=0.95,
  two_clean_batches:Array.isArray(data?.independent_batches)&&
   data.independent_batches.length>=2&&
   data.independent_batches.slice(-2).every(x=>x.p0_escapes===0&&
    Number.isInteger(x.distinct_projects)&&x.distinct_projects>=30)
 };
 return {status:Object.values(gates).every(Boolean)?"VALIDATED_IN_DECLARED_SCOPE":"NOT_YET_VALIDATED",
  scope:data?.scope||"not declared",projects:projectSet.size,cases:total,agents:agentSet.size,
  reviewed_cases:total-unreviewed,paired_runs:pairs,critical_false_accepts:criticalFalseAccepts,
  verdicts:outcomes,scores,gates,
  caution:"These are adjudicated agreement results within the frozen sample, never proof of universal correctness. Self-reported gold labels and host actions require independent audit."};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const path=process.argv[2];if(!path){console.error("Usage: node scripts/are-method-benchmark.mjs <frozen-reviewed-cases.json>");process.exitCode=2;}
 else{
  try{
   const r=evaluateAREMethod(JSON.parse(readFileSync(path,"utf8")));
   console.log(JSON.stringify(r,null,2));
   if(r.status!=="VALIDATED_IN_DECLARED_SCOPE")process.exitCode=2;
  }catch(e){console.error(String(e));process.exitCode=2;}
 }
}
