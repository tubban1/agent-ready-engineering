"""Single ARE case report, verified evidence and link-only distribution gates."""
import collections
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
PAGE=ROOT/"public/evidence/solarstorm"
CANONICAL="https://are.world2.co/evidence/solarstorm/"
CASE=json.loads((ROOT/"docs/cases/data/solarstorm.json").read_text())


def records(name):
    return [json.loads(line) for line in (PAGE/name).read_text().splitlines() if line.strip()]


class SingleCasePageTests(unittest.TestCase):
    def test_only_one_primary_public_report(self):
        text=(PAGE/"index.html").read_text()
        self.assertIn('<link rel="canonical" href="'+CANONICAL+'">',text)
        self.assertIn('Review summary &amp; findings',text)
        self.assertIn('Method, provenance &amp; evidence',text)
        self.assertIn('id="checks"',text)
        self.assertIn('id="replay"',text)

    def test_39_distinct_states_and_distribution(self):
        rows=records("checks.jsonl")
        self.assertEqual(39,len(rows))
        self.assertEqual(39,len({x["check_id"] for x in rows}))
        self.assertEqual(CASE["assessment"]["counts"],dict(collections.Counter(x["status"] for x in rows)))
        self.assertTrue(all(not x["source_deployment_bound"] for x in rows))

    def test_real_four_public_tool_observations(self):
        tools=records("tools.jsonl")
        self.assertEqual(4,len(tools))
        self.assertEqual(set(CASE["scope"]["allowed_tools"]),{x["tool"] for x in tools})
        self.assertTrue(all(x["success_path_invoked"] and x["contract_inspected"] and x["public_read_only"] for x in tools))

    def test_oracle_keeps_real_mismatch(self):
        oracle=records("oracle.jsonl")
        self.assertEqual(3,len(oracle))
        self.assertEqual(2,sum(x["match_at_capture"] for x in oracle))
        self.assertTrue(any(not x["match_at_capture"] and x["volatile_instantaneous_data"] for x in oracle))

    def test_no_maturity_grade_or_false_certification(self):
        meta=json.loads((PAGE/"case_summary.json").read_text())
        self.assertEqual("NOT_ESTABLISHED",meta["maturity_level"])
        self.assertFalse(meta["production_source_bound"])
        self.assertFalse(meta["full_protocol_certification"])
        self.assertEqual(1,meta["real_agent_runs"])

    def test_one_page_has_direct_evidence(self):
        s=(PAGE/"index.html").read_text()
        for name in ("checks.jsonl","tools.jsonl","oracle.jsonl","case_summary.json"):
            self.assertIn('./'+name,s)
        self.assertIn('id="toolInventory"',s)
        self.assertIn('id="oracleEvidence"',s)
        self.assertIn('L2-C2',s)  # inline data includes the finding
        self.assertNotIn("ARE_EVIDENCE_DATA_PLACEHOLDER",s)
        manifest=json.loads((PAGE/"sha256.json").read_text())
        for file,digest in manifest.items():
            self.assertEqual(digest,hashlib.sha256((PAGE/file).read_bytes()).hexdigest())

    def test_js_is_valid_and_provenance_is_embedded(self):
        s=(PAGE/"index.html").read_text()
        js=s.split("<script>\n",1)[1].split("</script>",1)[0]
        with tempfile.TemporaryDirectory() as folder:
            f=Path(folder)/"review.js";f.write_text(js)
            check=subprocess.run(["node","--check",str(f)],capture_output=True,text=True)
            self.assertEqual(0,check.returncode,check.stderr)
        content=json.loads(s.split('id="evidence">',1)[1].split("</script>",1)[0])
        self.assertEqual(39,len(content["checks"]))
        self.assertEqual(4,len(content["tools"]))

    def test_browser_bootstrap_and_render_complete(self):
        result=subprocess.run(
            ["node",str(ROOT/"scripts/test_are_case_page_ui.mjs"),str(PAGE/"index.html")],
            capture_output=True,text=True)
        self.assertEqual(0,result.returncode,result.stdout+result.stderr)
        self.assertIn("CASE_UI_RENDER_PASS",result.stdout)

    def test_public_files_are_redacted(self):
        for f in PAGE.iterdir():
            if f.suffix not in {".html",".json",".jsonl"}:continue
            s=f.read_text()
            for secret in ("/Users/wahaha","C:\\Users\\","@world2.co","liang.rao@gmail.com","hf_"):
                self.assertNotIn(secret,s,f.name)

    def test_site_home_has_only_canonical_case_cta(self):
        home=(ROOT/"public/index.html").read_text()
        self.assertIn('href="/evidence/solarstorm/"',home)
        self.assertNotIn('href="/media/solarstorm/"',home)
        self.assertNotIn('href="/datasets/solarstorm-20261116/"',home)

    def test_retired_media_routes_redirect_and_files_removed(self):
        cfg=json.loads((ROOT/"vercel.json").read_text())
        rules=cfg.get("redirects",[])
        self.assertTrue(any(r["source"]=="/media/solarstorm/:path*" for r in rules))
        self.assertTrue(any(r["source"]=="/datasets/solarstorm-20261116/:path*" for r in rules))
        self.assertEqual({"index.html"},{f.name for f in (ROOT/"public/media/solarstorm").iterdir()})
        self.assertEqual({"index.html"},{f.name for f in (ROOT/"public/datasets/solarstorm-20261116").iterdir()})
        self.assertFalse((ROOT/"dist/solarstorm-s11-v1").exists())

    def test_short_channel_copy_one_url(self):
        t=(ROOT/"docs/channels/SOLARSTORM_LINK_POSTS.md").read_text()
        self.assertEqual(1,len(set(re.findall(r"https://are\.world2\.co/evidence/solarstorm/",t))))
        self.assertEqual(6,t.count(CANONICAL))  # intro, HF, ModelScope, X, LinkedIn, Reddit
        self.assertNotIn("https://are.world2.co/media/",t)
        self.assertNotIn("https://are.world2.co/datasets/",t)
        self.assertIn("under moderation",t)
        self.assertIn("reddit",t.lower())

    def test_source_evidence_integrity_kept(self):
        p=ROOT/"docs/cases/data/solarstorm.json"
        case=json.loads(p.read_text())
        self.assertEqual("PUBLISHED",case["channels"]["are_website"]["status"])
        self.assertEqual(CANONICAL,case["channels"]["are_website"]["url"])
        self.assertEqual("PARTIAL",case["stages"]["S11"]["status"])
        self.assertTrue((ROOT/"docs/cases/solarstorm-2026-11-16.md").exists())

if __name__=="__main__":
    unittest.main()
