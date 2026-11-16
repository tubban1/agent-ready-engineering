import {resolve} from "node:path";
import type {Workspace} from "./workspace.js";
function requirePath(dir:string,part:string):string {return resolve(dir,part.trim().split(/\s+/)[0]!.split("#")[0]!);}
import {loadRiskProfile,requiredOperations,reviewRiskProfile} from "./risk-profile.js";

export type NaResult={ok:boolean;check:string;issues:string[];scope:string[];reason:string|null};
const DATE=/^\d{4}-\d{2}-\d{2}$/;
export function parseNA(text:string):Record<string,string>|null {
 const m=/^\s*N\/A\s*\{([\s\S]+)\}\s*$/i.exec(text);
 if(!m)return null;
 const obj:Record<string,string>={};
 for(const field of m[1]!.split(";")){
   const i=field.indexOf("=");
   if(i<1)return null;
   const k=field.slice(0,i).trim().toLowerCase(),v=field.slice(i+1).trim();
   if(!["scope","reason","evidence","reviewer","reviewed_at"].includes(k)||!v||obj[k])return null;
   obj[k]=v;
 }
 return obj;
}
export function reviewNA(ws:Workspace,dir:string,check:string,raw:string,profilePath:string|null,assessmentDate?:string):NaResult {
 const n=parseNA(raw),issues:string[]=[];
 if(!n||!["scope","reason","evidence","reviewer","reviewed_at"].every(k=>n[k])){
  return {ok:false,check,scope:[],reason:null,issues:["na_requires_structured_scope_reason_evidence_reviewer_date"]};
 }
 const scopes=n.scope!.split(",").map(x=>x.trim()).filter(Boolean);
 if(scopes.length<1||new Set(scopes).size!==scopes.length)
  issues.push("na_invalid_or_duplicate_scope");
 const reason=n.reason!;
 const hanCharacters=[...reason.matchAll(/\p{Script=Han}/gu)].length;
 if(reason.length<18 || /(.)\1{7,}/u.test(reason) ||
     (hanCharacters<8 && reason.trim().split(/\s+/).length<4))
   issues.push("na_reason_unsubstantiated_or_filler");
 if(n.reviewer!.length<2||/^(?:unknown|agent|automatic|tbd|n\/a)$/i.test(n.reviewer!))
  issues.push("na_reviewer_not_confirmed");
 if(!DATE.test(n.reviewed_at!)||!Number.isFinite(Date.parse(n.reviewed_at!)) ||
   new Date(n.reviewed_at!+"T00:00:00Z").toISOString().slice(0,10)!==n.reviewed_at)
  issues.push("na_review_date_invalid");
 if(assessmentDate&&n.reviewed_at!>assessmentDate)
  issues.push("na_review_after_assessment");
 const validEvidence=ws.evidenceStatus(dir,n.evidence!)==="ok";
 if(!validEvidence)issues.push("na_evidence_missing_or_outside_workspace");
 let evidenceText="";
 if(validEvidence)try{
   const full=ws.resolve(requirePath(dir,n.evidence!),"file");
   const contents=ws.read(full);
   evidenceText=Buffer.byteLength(contents)<200000?contents.slice(0,30000):"";
 }catch{issues.push("na_evidence_unreadable");}
 if(!profilePath)issues.push("na_risk_profile_missing");
 else try {
  const profile=loadRiskProfile(ws,profilePath);
  if(n.reviewed_at!<profile.reviewed_at)issues.push("na_review_before_risk_profile");
  if(validEvidence&&evidenceText){
    const targeted=scopes.includes("all")?profile.operations.map(x=>x.id):scopes;
    const mentioned=targeted.filter(id=>evidenceText.includes(id));
    if(!mentioned.length || (!scopes.includes("all") && mentioned.length!==targeted.length))
      issues.push("na_evidence_does_not_identify_scoped_operation");
  }else if(validEvidence)issues.push("na_evidence_empty");
  const pr=reviewRiskProfile(ws,profilePath,dir);
  if(pr.issue_count)issues.push("na_risk_profile_unverified");
  const known=new Set(profile.operations.map(x=>x.id));
  if(scopes.includes("all")){
    if(scopes.length!==1||known.size!==profile.tool_catalog_count)
     issues.push("na_all_scope_not_inventory_complete");
  }else if(scopes.some(id=>!known.has(id)))issues.push("na_scope_not_in_risk_inventory");
  const required=requiredOperations(profile,check);
  if(required.length)issues.push("na_check_applies_to_operations:"+required.join(","));
 }catch{
  issues.push("na_risk_profile_invalid_or_outside");
 }
 return {ok:issues.length===0,check,scope:scopes,reason:n.reason!,issues};
}
