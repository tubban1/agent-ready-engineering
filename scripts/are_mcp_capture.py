#!/usr/bin/env python3
"""Capture native raw MCP request/response for an authorized ARE V5 assessment.

Standard-library only. Does not connect to the private ARE database. Never
stores OAuth or Task Tokens. Outputs ASSESSOR_REPORTED evidence, not ARE-attested
network provenance. Prefer ARE MCP are_capture_readonly when possible.
"""
from __future__ import annotations
import argparse
import datetime as dt
import hashlib
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

LIMIT = 60_000
BAD_NAME = re.compile(r"delete|remove|send|purchase|payment|charge|order|write|update|modify|create|register|refund|execute|shell|terminal|upload|deploy|grant|transfer|approve|post|publish|reserve|booking|subscribe|cancel", re.I)
SECRET = re.compile(r"(?:Bearer\s+[A-Za-z0-9._-]{16,}|sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9_-]{20,}|-----BEGIN\s+(?:RSA |EC )?PRIVATE KEY-----)", re.I)

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise RuntimeError("Refusing target MCP HTTP redirect")

def invoke_http(endpoint: str, request: dict, timeout: int = 15):
    if not endpoint.startswith("https://"):
        raise ValueError("Only explicitly supplied HTTPS MCP URL is supported")
    access_token = os.getenv("ARE_TARGET_MCP_ACCESS_TOKEN", "")
    wire_request = json.dumps(request, ensure_ascii=False, separators=(",", ":"))
    headers = {"Content-Type": "application/json", "Accept": "application/json,text/event-stream",
               "MCP-Protocol-Version": "2025-06-18", "User-Agent": "ARE-V5-client-recorder/1"}
    if access_token:
        headers["Authorization"] = "Bearer " + access_token
    opener = urllib.request.build_opener(NoRedirect())
    req = urllib.request.Request(endpoint, wire_request.encode("utf-8"), headers, method="POST")
    with opener.open(req, timeout=timeout) as response:
        raw = response.read(LIMIT + 1)
        if len(raw) > LIMIT:
            raise ValueError("Target MCP response exceeds capture limit")
        wire_response = raw.decode("utf-8")
        if "text/event-stream" in response.headers.get("Content-Type", ""):
            frames = [line[5:].strip() for line in wire_response.splitlines() if line.startswith("data:")]
            if not frames:
                raise ValueError("No MCP SSE response event")
            obj = json.loads(frames[-1])
            transport = "sse"
        else:
            obj = json.loads(wire_response)
            transport = "http"
    return wire_request, wire_response, obj, transport

def invoke_stdio(command: list[str], request: dict, timeout: int = 15):
    # No shell=True; agents must supply a JSON array of executable arguments.
    if not command or not all(isinstance(s, str) and s for s in command):
        raise ValueError("Expected a JSON array of executable + arguments")
    if len(command) > 25:
        raise ValueError("Too many process arguments")
    init = {"jsonrpc":"2.0","id":1,"method":"initialize","params":{
        "protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"ARE V5 local capture","version":"1"}}}
    initialized = {"jsonrpc":"2.0","method":"notifications/initialized","params":{}}
    method_request = dict(request, id=2)
    wire_request = json.dumps(method_request, separators=(",", ":"))
    lines = [json.dumps(init), json.dumps(initialized), wire_request]
    p = subprocess.Popen(command,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
                         text=True,encoding="utf-8",env=os.environ.copy())
    try:
        stdout,stderr = p.communicate("\n".join(lines)+"\n", timeout=timeout)
    except subprocess.TimeoutExpired:
        p.kill()
        stdout,stderr = p.communicate()
    if len(stdout.encode()) > LIMIT:
        raise ValueError("STDIO response exceeds capture size")
    candidates = []
    for line in stdout.splitlines():
        try:
            response = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(response, dict) and response.get("id") == 2:
            candidates.append((line,response))
    if not candidates:
        raise RuntimeError("No matching JSON-RPC response on STDIO. Check sandbox, arguments and task logs.")
    wire_response,result = candidates[-1]
    return wire_request,wire_response,result,"stdio"

def save_capture(output: Path, endpoint: str, request: dict, wire_request: str,
                 wire_response: str, response: dict, transport: str):
    if response.get("id") != request["id"] or response.get("jsonrpc") != "2.0":
        raise ValueError("MCP request/response ID or protocol mismatch")
    if SECRET.search(wire_request) or SECRET.search(wire_response):
        raise ValueError("Potential credential in captured data; redact at source before saving")
    snapshot = {"protocol":"mcp.raw-observation.v1",
                "observed_at":dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00","Z"),
                "transport":transport,"endpoint":endpoint,
                "request":request,"response":response,
                "wire_request":wire_request,"wire_response":wire_response}
    content=json.dumps(snapshot, ensure_ascii=False, separators=(",",":"))
    artifact = {"id":"raw-"+hashlib.sha256(content.encode()).hexdigest()[:20],
                "kind":"trace","content":content,"sha256":hashlib.sha256(content.encode()).hexdigest(),
                "provenance":"ASSESSOR_REPORTED local MCP capture; wire bytes captured by this tool; not server-attested"}
    output.parent.mkdir(parents=True,exist_ok=True)
    descriptor = os.open(output,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(descriptor,"w",encoding="utf-8") as f:
        json.dump(artifact,f,ensure_ascii=False,indent=2)
    return artifact["id"]

def main(argv=None):
    parser=argparse.ArgumentParser(description="Record an MCP native request/response as ARE V5 raw evidence")
    target=parser.add_mutually_exclusive_group(required=True)
    target.add_argument("--endpoint",help="Screened HTTPS MCP endpoint")
    target.add_argument("--stdio-command-json",help="JSON array, e.g. ['node','index.mjs']; no shell")
    parser.add_argument("--method",choices=["tools/list","tools/call"],default="tools/list")
    parser.add_argument("--tool",help="Name of read-only tool")
    parser.add_argument("--arguments-json",default="{}")
    parser.add_argument("--user-approved",action="store_true",help="Human explicitly approved this safe test")
    parser.add_argument("--out",required=True,help="New private JSON file; refuses overwriting any existing file")
    parser.add_argument("--timeout",type=int,default=15)
    args=parser.parse_args(argv)
    if not (1<=args.timeout<=60):
        parser.error("timeout must be between 1 and 60 seconds")
    if args.method=="tools/call":
        if not args.user_approved or not args.tool or BAD_NAME.search(args.tool):
            parser.error("Explicit human approval and non-write tool name required for tools/call")
        parsed=json.loads(args.arguments_json)
        if not isinstance(parsed,dict):
            parser.error("--arguments-json must be a JSON object")
        params={"name":args.tool,"arguments":parsed}
    else:
        params={}
    req={"jsonrpc":"2.0","id":2 if args.stdio_command_json else 1,
         "method":args.method,"params":params}
    if args.endpoint:
        wire_in,wire_out,result,transport=invoke_http(args.endpoint,req,args.timeout)
        target_name=args.endpoint
    else:
        cmd=json.loads(args.stdio_command_json)
        if not isinstance(cmd,list):
            parser.error("--stdio-command-json must be a JSON array")
        wire_in,wire_out,result,transport=invoke_stdio(cmd,req,args.timeout)
        target_name="stdio://"+cmd[0]
    path=Path(args.out).expanduser().resolve()
    artifact_id=save_capture(path,target_name,req,wire_in,wire_out,result,transport)
    print(json.dumps({"saved":str(path),"artifact_id":artifact_id,
                      "provenance":"ASSESSOR_REPORTED_REQUIRES_REVIEW","method":args.method}))
    return 0

if __name__=="__main__":
    try:sys.exit(main())
    except (ValueError,RuntimeError,urllib.error.URLError) as exc:
        print("ARE capture failed: "+str(exc),file=sys.stderr)
        sys.exit(1)
