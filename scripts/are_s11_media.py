#!/usr/bin/env python3
"""Produce fact-locked ARE evidence data cards. SVG editable, PNG for socials."""
from __future__ import annotations
import argparse,html,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
CARDS=[
 {"id":"01","kicker":"THE ENGINEERING QUESTION","metric":"4 / 4",
  "title":"MCP tools actually called","sub":"One genuine Agent task with an independent NOAA comparison",
  "detail":"A successful tools/list alone does NOT prove Agent task success."},
 {"id":"02","kicker":"BOUNDED PROTOCOL PROFILE","metric":"9 PASS",
  "title":"0 FAIL in scoped MCP checks","sub":"Plus 1 UNKNOWN and 1 NOT_APPLICABLE",
  "detail":"Not full protocol certification; no untested requirements inferred."},
 {"id":"03","kicker":"ARE 39 CHECKS","metric":"23 UNKNOWN",
  "title":"4 PASS  ·  2 FAIL  ·  10 N/A","sub":"Two FAIL are ARE engineering recommendations, not MCP MUST violations.",
  "detail":"Maturity level: NOT ESTABLISHED. Never grade missing evidence as PASS."},
 {"id":"04","kicker":"INDEPENDENT NOAA DATA","metric":"2 / 3",
  "title":"Comparisons matched at capture","sub":"One time-varying instantaneous X-ray flux reading differed.",
  "detail":"GOES peak flare class matched. Every measurement has a timestamp."},
 {"id":"05","kicker":"SOURCE AND PRODUCTION","metric":"UNBOUND",
  "title":"Source 1.0.3  /  live 1.0.0","sub":"One real Claude task  ·  4 MCP calls  ·  snapshot 2026-11-16",
  "detail":"No official certification or operator endorsement. are.world2.co"}
]
def svg(w,h,c):
    wide=w>h
    S=w/1200 if wide else w/1080
    def q(v):return round(v*S)
    base=(
      f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
      f'<rect width="{w}" height="{h}" fill="#0e1b2d"/>'
      f'<path d="M0 {int(h*.69)} L{w} {int(h*.33)}" stroke="#183859" stroke-width="{q(3)}"/>'
      f'<rect x="{q(66)}" y="{q(68)}" width="{q(80)}" height="{q(9)}" fill="#48b9da" rx="{q(4)}"/>')
    top=q(124) if wide else int(h*.22)
    maxtext=34 if wide else 39
    title_y=top+q(96 if wide else 250)
    metric_size=q(124 if wide else 136)
    metric_y=title_y+q(164 if wide else 310)
    second_y=metric_y+q(98 if wide else 185)
    detail_y=min(h-q(110),second_y+q(91 if wide else 300))
    a=html.escape
    base+=f'<text x="{q(70)}" y="{top}" fill="#8cd9f3" font-family="Arial,Helvetica,sans-serif" font-weight="bold" font-size="{q(30)}" letter-spacing="3">{a(c["kicker"])}</text>'
    base+=f'<text x="{q(70)}" y="{title_y}" fill="#fff" font-family="Arial,Helvetica,sans-serif" font-weight="bold" font-size="{q(maxtext)}">{a(c["title"])}</text>'
    base+=f'<text x="{q(70)}" y="{metric_y}" fill="#55c8ee" font-family="Arial,Helvetica,sans-serif" font-weight="bold" font-size="{metric_size}">{a(c["metric"])}</text>'
    sub=c["sub"]
    if len(sub)>79:
        sub=sub[:76]+"..."
    base+=f'<text x="{q(70)}" y="{second_y}" fill="#e5f1fb" font-family="Arial,Helvetica,sans-serif" font-size="{q(23 if wide else 29)}">{a(sub)}</text>'
    # Ensure multiline caveat stays inside the frame.
    parts=[c["detail"][i:i+70] for i in range(0,len(c["detail"]),70)]
    for i,line in enumerate(parts):
        base+=f'<text x="{q(70)}" y="{detail_y+i*q(38)}" fill="#a9bfd1" font-family="Arial,Helvetica,sans-serif" font-size="{q(19 if wide else 24)}">{a(line)}</text>'
    base+=f'<rect x="{q(68)}" y="{h-q(72)}" width="{w-q(136)}" height="1" fill="#35526d"/>'
    base+=f'<text x="{q(70)}" y="{h-q(35)}" fill="#a9bfd1" font-family="Arial,Helvetica,sans-serif" font-size="{q(17)}">ARE / WORLD2   ·   SOURCE-GROUNDED CASE   ·   2026-11-16</text>'
    return base+'</svg>'
def build(out:Path):
    out.mkdir(parents=True,exist_ok=True)
    for orientation,w,h in [("landscape",1200,675),("vertical",1080,1920)]:
        dest=out/orientation;dest.mkdir(parents=True,exist_ok=True)
        for card in CARDS:
            p=dest/(card["id"]+".svg");p.write_text(svg(w,h,card),encoding="utf8")
            subprocess.run(["sips","-s","format","png",str(p),"--out",str(dest/(card["id"]+".png"))],capture_output=True,check=True)
    print(f"CARDS_OK count={len(CARDS)} sizes=1200x675,1080x1920 output={out}")
if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("--out",type=Path,default=ROOT/"dist/solarstorm-s11-v1/media")
    build(p.parse_args().out)
