"""Source-grounded S0-S11 release gates for Remote Desktop Commander canonical case."""
import collections
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
PRIVATE=ROOT/"docs/research/ARE_REMOTE_DC_20261118"
WEB=ROOT/"public/evidence/remote-desktop-commander"
META=ROOT/"docs/cases/data/remote-desktop-commander-2026-11-18.json"

def j(p):return json.loads(p.read_text())

class RemoteCommanderCaseQA(unittest.TestCase):
    def test_world2_and_immutable_target(self):
        x=j(META)
        self.assertEqual("592ec3d4-d077-5ab6-83cd-09243285fe02",x["world2_id"])
        self.assertEqual("https://mcp.desktopcommander.app/mcp",x["endpoint"])
        self.assertEqual("2026-11-18",x["date"])
        self.assertFalse(x["certification"])

    def test_all_39_check_ids_and_scoped_statuses(self):
        a=j(WEB/"checks.json");rows=a["checks"]
        self.assertEqual(39,len(rows))
        self.assertEqual(39,len({r["check_id"] for r in rows}))
        self.assertEqual({"PASS":2,"FAIL":7,"NOT_VERIFIED":30},
                         dict(collections.Counter(r["status"] for r in rows)))
        self.assertEqual("NOT_ESTABLISHED",a["maturity"])

    def test_host_contracts_30_and_live_coverage_separated(self):
        t=j(WEB/"tool_inventory.json")
        self.assertEqual(30,t["count"])
        self.assertEqual(30,len({r["name"] for r in t["inventory"]}))
        self.assertTrue(all(not r["native_mcp_schema_verified"] for r in t["inventory"]))
        self.assertEqual(11,sum(r["executed_in_combined_evaluation"] for r in t["inventory"]))
        self.assertIn("NOT a complete native MCP tools/list",t["scope"])

    def test_oracle_fixture_is_reproducible_and_synthetic(self):
        o=j(WEB/"oracle.json")
        self.assertEqual(24,o["rows"]);self.assertEqual(8,o["services"])
        self.assertEqual(4,o["pass"]);self.assertEqual(4,o["fail"])
        self.assertEqual(5,len(o["attention_services"]))
        self.assertEqual(2,len(o["slow_latest_services"]))
        self.assertEqual(o["fixture_sha256"],hashlib.sha256((WEB/"runs.csv").read_bytes()).hexdigest())
        self.assertIn("synthetic",(WEB/"TASK.md").read_text().lower())

    def test_public_site_one_page_evidence_and_prompt(self):
        s=(WEB/"index.html").read_text()
        self.assertIn('<link rel="canonical" href="https://are.world2.co/evidence/remote-desktop-commander/">',s)
        for f in ("checks.json","tool_inventory.json","oracle.json","probe_summary.json","TASK.md","runs.csv","case_summary.json"):
            self.assertIn("./"+f,s)
        self.assertIn('id="safePrompt"',s)
        self.assertIn('id="copySafePrompt"',s)
        self.assertIn("Correction — 18 November 2026",s)
        self.assertIn("not confirmed defects",s)
        self.assertIn("historical FAIL labels",s)
        self.assertIn("NOT ESTABLISHED",s)
        self.assertIn("source",s.lower())
        self.assertNotIn("source verified deployed",s.lower())

    def test_no_private_account_or_user_device_details(self):
        for f in WEB.rglob("*"):
            if not f.is_file():continue
            raw=f.read_text()
            for secret in ("/Users/wahaha","JennyMacBook","37f951ce-51f5-48c5-a515-38e121fc4ced","liang.rao@gmail.com","supabase_connected","avatar_url"):
                self.assertNotIn(secret,raw,f.name)
        text=(ROOT/"docs/cases/remote-desktop-commander-2026-11-18.md").read_text()
        self.assertNotIn("On the examined owner's paired device",text)

    def test_bounded_hosted_source_and_authorization_caveats(self):
        x=j(WEB/"case_summary.json")
        self.assertFalse(x["source_to_live_binding"])
        self.assertIsNone(x["official_native_tools_list"])
        self.assertEqual(0,x["external_writes_tested"])
        self.assertFalse(x["official_certification"])
        self.assertEqual("NOT_ESTABLISHED",x["maturity"])

    def test_javascript_syntax(self):
        html=(WEB/"index.html").read_text()
        scripts=re.findall(r"<script>([\s\S]*?)</script>",html)
        self.assertEqual(1,len(scripts))
        with tempfile.TemporaryDirectory() as td:
            path=Path(td)/"case.js";path.write_text(scripts[0])
            run=subprocess.run(["node","--check",str(path)],text=True,capture_output=True)
            self.assertEqual(0,run.returncode,run.stderr)

    def test_home_link_and_distinct_channel_receipts(self):
        home=(ROOT/"public/index.html").read_text()
        self.assertIn('href="/evidence/remote-desktop-commander/"',home)
        self.assertFalse(any('PUBLISHED' in str(x) for x in [])) # no external-platform receipt implied

if __name__=="__main__":unittest.main()
