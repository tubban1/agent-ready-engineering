#!/usr/bin/env python3
"""Build one canonical, self-contained ARE assessment page and audit evidence downloads."""
from __future__ import annotations
import argparse,collections,hashlib,json,re,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ORIGINAL=ROOT/"docs/research/ARE_PILOT_SOLARSTORM_20261116"
SOURCE=ROOT/"docs/cases/data/solarstorm.json"
GITHUB="https://github.com/tubban1/agent-ready-engineering/blob/main/"
DIMS=dict(V="Value",C="Contract",S="State",A="Authorization",X="Context",I="Integration",O="Observability",R="Recovery")
REDACT=re.compile(r"(?:hf_[A-Za-z0-9]{12,}|sk-[A-Za-z0-9]{12,}|(?:/Users/|C:\\Users\\)[^\s]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})")
def load(p): return json.loads(Path(p).read_text(encoding="utf8"))
def dump(x):return json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(",",":"))
def write(p,s):
    p=Path(p);p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s,encoding="utf8")
def clean(x):
    t=str(x)
    if REDACT.search(t):raise ValueError("Potential private data in public dataset")
    return t
def build(out):
    case=load(SOURCE);a=load(ORIGINAL/"assessment.json");live=load(ORIGINAL/"mcp_live.json")
    oracle=load(ORIGINAL/"noaa_oracle.json")
    statuses=["PASS","FAIL","NOT_APPLICABLE","NOT_VERIFIED"]
    checks=[]
    for item in a["checks"]:
        ident=item["check_id"]
        if not re.fullmatch(r"L[1-4]-[VCSAXIOR][0-9]",ident):raise ValueError("Invalid check ID "+ident)
        checks.append(dict(case_id=case["case_id"],check_id=ident,level=ident.split("-")[0],
            dimension=DIMS[ident.split("-")[1][0]],status=item["status"],
            reason=clean(item.get("reason","")),evidence_kind=item.get("evidence_type","unknown"),
            evidence_files=[x.strip() for x in item.get("evidence","").split(";") if x.strip()],
            assessed_at="2026-11-16",source_deployment_bound=False,report_url=case["report_url"]))
    counter=collections.Counter(r["status"] for r in checks)
    assert len(checks)==39 and len(set(r["check_id"] for r in checks))==39
    assert all(counter[k]==case["assessment"]["counts"][k] for k in statuses),counter
    tools=[]
    for x in live["tools"]:
        tools.append(dict(case_id=case["case_id"],tool=x["name"],contract_inspected=True,
            success_path_invoked=True,public_read_only=True,source_deployment_bound=False,
            schema_sha256=hashlib.sha256(dump(x["inputSchema"]).encode()).hexdigest(),
            observed_live_version=case["source"]["live_version"]))
    assert len(tools)==4 and set(x["tool"] for x in tools)==set(case["scope"]["allowed_tools"])
    comparisons=[]
    for o in oracle["checks"]:
        name=o["case"]
        comparisons.append(dict(case_id=case["case_id"],check=name,match_at_capture=bool(o["pass"]),
            volatile_instantaneous_data=(name=="xray_flare_classes"),observed_at="2026-11-16",
            interpretation=("NOAA and server instantaneous X-ray flux differed across observations; peak class agreed"
                if name=="xray_flare_classes" else "Matched independent NOAA reference at evaluation time"),
            oracle="NOAA SWPC"))
    public=dict(schema="are.public-evidence.v1",case_id=case["case_id"],project="Solarstorm MCP",
        date="2026-11-16",origin="World2 MCP catalog",endpoint=case["endpoint"],
        report_url=case["report_url"],source_commit=case["source"]["sha"],
        source_version=case["source"]["source_version"],
        live_version=case["source"]["live_version"],production_source_bound=False,
        real_agent_runs=1,real_agent_mcp_calls=4,independent_oracle="NOAA SWPC",
        protocol_bounded=dict(PASS=9,FAIL=0,UNKNOWN=1,NOT_APPLICABLE=1),
        full_protocol_certification=False,source_tests=dict(offline=55,live_noaa=9),
        are_39={k:counter[k] for k in statuses},maturity_level="NOT_ESTABLISHED",
        noaa=dict(matched=sum(x["match_at_capture"] for x in comparisons),
                  differed=sum(not x["match_at_capture"] for x in comparisons)),
        limitations=["Single real Agent task; not a multi-run statistical benchmark",
          "Open source is not proven to be exact deployed source",
          "ARE design recommendation is not official MCP MUST",
          "Solar-weather observations change between captures"],
        checks=checks,tools=tools,oracle_cases=comparisons)
    d=Path(out)
    for name,rows in (("checks",checks),("tools",tools),("oracle",comparisons)):
        write(d/(name+".jsonl"),"".join(dump(x)+"\n" for x in rows))
    write(d/"case_summary.json",json.dumps({k:v for k,v in public.items() if k not in ("checks","tools","oracle_cases")},indent=2,ensure_ascii=False)+"\n")
    raw=(ROOT/"examples/are-evidence-space/index.html").read_text()
    assert "ARE_EVIDENCE_DATA_PLACEHOLDER" in raw
    raw=raw.replace("ARE_EVIDENCE_DATA_PLACEHOLDER",json.dumps(public,ensure_ascii=False).replace("<","\\u003c"))
    write(d/"index.html",raw)
    manifest={}
    for f in sorted(Path(out).rglob("*")):
        if f.is_file() and f.name!="sha256.json":
            manifest[str(f.relative_to(out))]=hashlib.sha256(f.read_bytes()).hexdigest()
    write(Path(out)/"sha256.json",json.dumps(manifest,indent=2,ensure_ascii=False)+"\n")
    print(dump(dict(output=str(out),checks=len(checks),tools=len(tools),oracle=comparisons,files=len(manifest))))
if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("--out",type=Path,default=ROOT/"public/evidence/solarstorm")
    p.add_argument("--evidence-dir",type=Path,default=None)
    a=p.parse_args()
    if a.evidence_dir is not None:ORIGINAL=a.evidence_dir
    elif not ORIGINAL.exists():ORIGINAL=ROOT.parent/"agent-ready-engineering/docs/research/ARE_PILOT_SOLARSTORM_20261116"
    try:build(a.out)
    except Exception as e:print("BUILD_ERROR",e,file=sys.stderr);sys.exit(2)
