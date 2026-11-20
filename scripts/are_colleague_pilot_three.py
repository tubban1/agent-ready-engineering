#!/usr/bin/env python3
"""Reproducible, private ARE three-project intake pilot.
Uses only version-pinned local Git source + recorded public read-only MCP probes.
Not a certification and not permission for third-party publication.
"""
import json
import os
import subprocess
import sys
from pathlib import Path

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
from are_evaluator_workflows import make_input, assess

ROOT=Path("/tmp/are-colleague-pilot-20261120")
OUT=Path("/tmp/are-colleague-pilot-results-20261120")
OUT.mkdir(mode=0o700,exist_ok=True)
os.chmod(OUT,0o700)
REVIEWER="colleague-pilot"
OWNER={"agent-connectors-mcp":"janijegoroff","etuki-gate":"cooyun",
 "norway-location-transport-mcp":"trondbjoroy"}
TARGETS=[
 ("janijegoroff/agent-connectors-mcp","agent-connectors-mcp","https://agentconnectors.dev/mcp"),
 ("cooyun/etuki-gate","etuki-gate","https://www.etuki.com/api/v1/mcp"),
 ("trondbjoroy/norway-location-transport-mcp","norway-location-transport-mcp",""),
]

def json_file(path,data):
 path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n")
 os.chmod(path,0o600)

def observe(check,version,value,trace,oracle):
 return {"value":value,"version":version,"evidence_id":"sha256:"+trace,
 "method":"DIRECT_TEST","surface":"NATIVE_MCP","protocol_id":check+"@pilot-2026-11-18",
 "sample_count":1,"trace_refs":["sha256:"+trace],"oracle_id":oracle,
 "observed_by":REVIEWER,"evidence_origin":"ASSESSOR_DIRECT_TEST"}

def fact(value,version,ref):
 return {"value":value,"version":version,"evidence_id":ref,
 "observed_by":REVIEWER,"evidence_origin":"ASSESSOR_DIRECT_TEST"}

for repo,slug,endpoint in TARGETS:
 folder=ROOT/slug
 sha=subprocess.check_output(["git","-C",str(folder),"rev-parse","HEAD"],text=True).strip()
 assert len(sha)==40
 assert "MIT License" in (folder/"LICENSE").read_text()
 probe=None
 if endpoint:
  fn="/tmp/are-pilot-mcp-"+repo.replace("/","_")+"-read-task.json"
  probe=json.loads(Path(fn).read_text())
  assert probe["repository"]==repo and probe["endpoint"]==endpoint
  assert probe["initialization"]["http"]==200
  version=f"live:{probe['initialization']['version']}/server:{probe['initialization']['serverInfo']['version']}"
 else:version="source:"+sha
 src=make_input("ARE_INDEPENDENT","product",repo,version,OWNER[slug],REVIEWER,"ARE Research",
                endpoint=endpoint,source_revision=sha)
 src["facts"]={}
 src["observations"]={}
 tasks=[]
 binding=""
 if probe:
  assert probe["tools"]
  names={x["name"] for x in probe["tools"]}
  actual_read=[x for x in probe["tools"] if x.get("annotations",{}).get("readOnlyHint") is True]
  inventory=next((x for x in probe["trace"] if x["method"]=="tools/list"),None)
  assert inventory is not None
  src["facts"]["has_read_tools"]=fact(len(actual_read)>0,version,"source-and-mcp-tools-list")
  src["facts"]["has_tools"]=fact(True,version,"native-tools-list")
  # One complete native tool enumeration: no cursor in observed response.
  src["observations"]["complete_native_tool_inventory"]=observe(
   "MCP-L1-V4",version,True,inventory["sha256"],"source-tool-handlers:"+sha)
  task=probe["agent_task"]
  if task and task.get("status")=="CALL_RETURNED" and task.get("isError") is False:
   oracle_ok=False
   oracle_id="not_independently_verified"
   if slug=="agent-connectors-mcp":
    oracle=json.loads(Path("/tmp/are-oracle-agent-connectors-20261120.json").read_text())
    oracle_ok=oracle["all_category_counts_match"] is True
    oracle_id="public-API-category-counts:"+oracle["source_response_sha256"]
    assert task["tool"]=="list_categories" and oracle_ok
   tasks.append({"goal":("Count public connector categories via live MCP; independently recount their public API."
                         if slug=="agent-connectors-mcp" else
                         "Discover supported model catalog totals through the public MCP."),
                 "agent":"GPT-6+OWL-LAB-bounded-pilot",
                 "trace_ref":"sha256:"+task["result_sha256"],"oracle_ref":oracle_id,
                 "authorized":True,"status":"PASS","oracle_verified":oracle_ok})
   if oracle_ok:
    src["observations"]["read_agent_task_independently_reproducible"]=observe(
       "MCP-L2-O2",version,True,task["result_sha256"],oracle_id)
 if slug=="agent-connectors-mcp":
  assert {x["name"] for x in probe["tools"]}=={"search_tools","get_tool","list_categories"}
  binding=f"{repo}@{sha}:README.md#Remote-endpoint+src/server.ts"
  summary=("Public MCP 0.1.0: 3 tools observed, all safe read-only; one live Agent list_categories "
           "task matched an independent recount of 531 public directory entries in 17 categories. "
           "Source-to-deployment commit binding remains UNVERIFIED; this is a provisional review.")
  changes=[
   "Document an externally verifiable binding between the deployed MCP server and its source commit.",
   "Publish representative invalid-input and pagination recovery examples for Agent operators.",
   "Provide a clearly identified public maintainer contact for optional technical feedback."
  ]
 elif slug=="etuki-gate":
  assert len(probe["tools"])==9
  binding=f"{repo}@{sha}:README.md#MCP-tools+gateway-routes/mcp-route.ts"
  summary=("Public MCP connected using protocol 2024-11-05 and exposed 9 tools and 2 resources; "
           "a read-only list_supported_models call returned a catalog count. "
           "World2's older 4-tool snapshot is not the live tool inventory. "
           "Independent pricing correctness and deployment-source binding are NOT VERIFIED.")
  changes=[
   "Publish exact deployed MCP protocol and source revision provenance, distinct from README claims.",
   "Provide an independently reproducible model-pricing oracle with a version-pinned rate card.",
   "Add one verified read-only Agent task with explicit external success evidence."
  ]
 else:
  summary=("MIT-licensed source checkout inspected, with pinned Git revision. README describes "
           "21 transport/geospatial MCP tools, but no deployed public endpoint is linked in the "
           "repository. Native tools/list, real Agent task and external API results NOT TESTED.")
  changes=[
   "Provide an accessible test MCP endpoint or a safe isolated stdio test fixture.",
   "Document source-to-deployment version provenance and read-only authorization scope.",
   "Publish a reproducible simple address/transport lookup test with an external Entur/Kartverket oracle."
  ]
 # Bound source association can be claimed for tool/endpoint match, not for deployed binary revision.
 result=assess(src)
 assert len(result["findings"])==32 and result["public_release_authorized"] is False
 result_path=OUT/(slug+".result.json")
 input_path=OUT/(slug+".input.json")
 tasks_path=OUT/(slug+".tasks.json")
 package_path=OUT/(slug+".package.json")
 json_file(input_path,src);json_file(result_path,result);json_file(tasks_path,tasks)
 argv=[sys.executable,str(HERE/"are_colleague_client.py"),"pack","--result",str(result_path),
       "--repository",repo,"--tasks",str(tasks_path),"--summary",summary,
       "--output",str(package_path)]
 for line in changes:argv+=["--recommendation",line]
 # Binding evidence is an assessor-provided source/endpoint consistency check.
 if binding:argv+=["--source-binding",binding]
 subprocess.run(argv,check=True,stdout=subprocess.DEVNULL)
 package=json.loads(package_path.read_text())
 assert package["report"]["target"]["source_revision"]==sha
 print(json.dumps({"repository":repo,"source_sha":sha,"endpoint":endpoint or None,
   "pilot_status":"PRIVATE_ONLY","criteria_total":len(result["findings"]),
   "status_counts":result["status_counts"],"agent_tasks":len(tasks),
   "independently_oracle_verified_tasks":sum(x["oracle_verified"] for x in tasks),
   "package":str(package_path)},ensure_ascii=False))
print("PILOT_PACKAGES_READY")
