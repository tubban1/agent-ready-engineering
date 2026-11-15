// Local-only, read-only evidence gate for creator-owned stdio MCP projects.
import { resolve } from "node:path";
import { Workspace } from "./workspace.js";
import { validateLocalMcpAudit } from "./audit-gate.js";

const args=process.argv.slice(2);
function param(flag:string) {
 const i=args.indexOf(flag);
 return i>=0?args[i+1]:undefined;
}
const root=param("--workspace"),report=param("--report")||"ARE_LOCAL_AUDIT_REPORT.md";
if(!root||args.includes("--help")||args.includes("-h")){
 process.stdout.write("ARE local evidence quality gate (no upload, not certification)\n"+
  "Usage: node mcp/dist/src/audit-gate-cli.js --workspace /absolute/project --report ARE_LOCAL_AUDIT_REPORT.md\n"+
  "Report must be inside authorized workspace. Exit code 2 means source/evidence review required.\n");
 process.exitCode=root?0:1;
}else{
 try{
  const ws=new Workspace(resolve(root));
  const result=validateLocalMcpAudit(ws,report);
  process.stdout.write(JSON.stringify(result,null,2)+"\n");
  if(result.blocker_count>0)process.exitCode=2;
 }catch(e){
  process.stderr.write("ARE_LOCAL_AUDIT_GATE_ERROR: "+(e instanceof Error?e.message:String(e))+"\n");
  process.exitCode=3;
 }
}
