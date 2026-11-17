/**
 * Local, bounded operation-level risk profile. It is a coverage aid, NOT
 * permission to execute tools and NOT an ARE maturity verdict.
 */
import {z} from "zod";
import {dirname} from "node:path";
import type {Workspace} from "./workspace.js";
import {KnowledgeError} from "./knowledge.js";

const operation=z.object({
  id:z.string().regex(/^[a-zA-Z0-9_.:/-]{1,150}$/),
  read:z.enum(["none","public","private","sensitive"]),
  write:z.enum(["none","reversible","irreversible"]),
  external_effect:z.boolean(),
  privileged_execution:z.boolean(),
  financial:z.boolean(),
  long_running:z.boolean(),
  draft_state:z.boolean(),
  annotations:z.object({readOnlyHint:z.boolean().optional(),destructiveHint:z.boolean().optional()}).strict().optional(),
  evidence:z.string().min(1).max(280),
  evidence_type:z.enum(["inspected","documented"]),
}).strict();
export const profileSchema=z.object({
 schema:z.literal("are.operation-risk.v1"),
 target:z.string().min(1).max(220),
 source_revision:z.string().min(7).max(100),
 standard_version:z.string().min(1).max(60),
 tool_catalog_count:z.number().int().min(1).max(10000),
 operation_count:z.number().int().min(1).max(10000),
 ingress_paths:z.array(z.string().min(1)).min(1).max(20),
 operations:z.array(operation).min(1).max(10000),
 reviewed_by:z.string().min(2).max(130),
 reviewed_at:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
}).strict();
export type OperationRiskProfile=z.infer<typeof profileSchema>;
type Flag={code:string; operation?:string; check?:string; message:string};
const relevant: Record<string,(p:OperationRiskProfile)=>string[]> = {
  "L2-A1":p=>p.operations.filter(o=>o.read==="private"||o.read==="sensitive").map(o=>o.id),
  "L2-A2":p=>p.operations.filter(o=>o.read==="private"||o.read==="sensitive").map(o=>o.id),
  "L3-C1":p=>p.operations.filter(o=>o.write!=="none"||o.external_effect||o.financial||o.privileged_execution).map(o=>o.id),
  "L3-C2":p=>p.operations.filter(o=>o.write!=="none").map(o=>o.id),
  "L3-C3":p=>p.operations.filter(o=>o.write!=="none"||o.external_effect||o.financial).map(o=>o.id),
  "L3-S1":p=>p.operations.filter(o=>o.long_running).map(o=>o.id),
  "L3-S2":p=>p.operations.filter(o=>o.draft_state).map(o=>o.id),
  "L3-A1":p=>p.operations.filter(o=>o.write!=="none"||o.external_effect||o.privileged_execution||o.financial||o.read==="sensitive").map(o=>o.id),
  "L3-A2":p=>p.operations.filter(o=>o.write==="irreversible"||o.external_effect||o.privileged_execution||o.financial).map(o=>o.id),
  "L3-A3":p=>p.operations.filter(o=>o.read==="sensitive"||o.privileged_execution||o.financial).map(o=>o.id),
  "L3-A4":p=>p.operations.filter(o=>o.write==="irreversible"||o.external_effect||o.privileged_execution||o.financial).map(o=>o.id),
  "L3-O1":p=>p.operations.filter(o=>o.write==="irreversible"||o.external_effect||o.privileged_execution||o.financial).map(o=>o.id),
  "L4-I2":p=>p.ingress_paths.length>1?p.operations.map(o=>o.id):[]
};

export function requiredOperations(profile:OperationRiskProfile,check:string):string[]{
 return relevant[check]?.(profile)??[];
}
export function loadRiskProfile(ws:Workspace,path:string):OperationRiskProfile {
 const absolute=ws.resolve(path,"file");
 const source=ws.read(absolute);
 if(Buffer.byteLength(source)>240000)throw new KnowledgeError("risk_profile_too_large","Risk profile cannot exceed 240 KB.");
 let json:unknown;
 try{json=JSON.parse(source);}catch{throw new KnowledgeError("invalid_risk_profile","Expected a JSON operation-risk profile.");}
 const parsed=profileSchema.safeParse(json);
 if(!parsed.success)throw new KnowledgeError("invalid_risk_profile",parsed.error.issues.slice(0,4).map(x=>x.path.join(".")+": "+x.message).join("; "));
 return parsed.data;
}
export function reviewRiskProfile(ws:Workspace,path:string,scenarioDir?:string){
 const profile=loadRiskProfile(ws,path);
 const dir=scenarioDir||dirname(ws.resolve(path,"file"));
 const issues:Flag[]=[];
 if(/REPLACE|PLACEHOLDER/i.test(profile.target)||/REPLACE|PLACEHOLDER/i.test(profile.source_revision)||/REPLACE|PLACEHOLDER/i.test(profile.reviewed_by))
  issues.push({code:"risk_profile_placeholder",message:"Replace all example values with a real revision, service identity and reviewer."});
 const ids=new Set<string>();
 for(const op of profile.operations){
  if(ids.has(op.id))issues.push({code:"duplicate_operation",operation:op.id,message:"Operation ID duplicated."});
  ids.add(op.id);
  if(ws.evidenceStatus(dir,op.evidence)!=="ok")
   issues.push({code:"operation_evidence_missing",operation:op.id,message:"Risk source evidence is missing or outside authorized scenario."});
  if(op.annotations?.readOnlyHint===true && (op.write!=="none"||op.external_effect||op.financial||op.privileged_execution))
   issues.push({code:"annotation_risk_conflict",operation:op.id,message:"Declared readOnlyHint conflicts with risk flags; inspect actual side effects."});
 }
 if(profile.operation_count!==ids.size||profile.tool_catalog_count!==ids.size)
  issues.push({code:"catalog_coverage_mismatch",message:"Operation inventory must cover every discovered tool (tool_catalog_count and operation_count)."});
 if(new Set(profile.ingress_paths).size!==profile.ingress_paths.length)
  issues.push({code:"duplicate_ingress",message:"Ingress paths must be unique."});
 if(profile.standard_version!=="ARE-A02@0.5")
  issues.push({code:"version_mismatch",message:"Operation risk profile must explicitly use ARE-A02@0.5 for current assessments."});
 const applicableChecks=Object.fromEntries(Object.keys(relevant).map(k=>[k,requiredOperations(profile,k)]));
 return {schema:"are.operation-risk-review.v1",profile:path,target:profile.target,source_revision:profile.source_revision,
  operation_count:profile.operation_count,reviewer:profile.reviewed_by,reviewed_at:profile.reviewed_at,
  issues,issue_count:issues.length,applicable_checks:applicableChecks,
  verdict:issues.length?"REVIEW_REQUIRED":"STRUCTURALLY_REVIEWABLE_NOT_CERTIFIED",
  limitation:"Risk profile describes the inventoried operations; it does not execute, attest source behavior, prove human authorization, or certify a maturity level."};
}
