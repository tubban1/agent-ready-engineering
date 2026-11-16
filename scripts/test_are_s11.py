"""ARE S11 public release assets: reproducible privacy- and evidence-aware QA."""
import collections
import json
from pathlib import Path
import struct
import subprocess
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"dist/solarstorm-s11-v1"
PUBLIC=ROOT/"public"
CASE=json.loads((ROOT/"docs/cases/data/solarstorm.json").read_text())

def load_jsonl(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]

class S11ReleaseTests(unittest.TestCase):
    def test_39_unique_check_ids_and_real_counts(self):
        rows=load_jsonl(OUT/"hf-dataset/checks.jsonl")
        self.assertEqual(39,len(rows))
        self.assertEqual(39,len({x["check_id"] for x in rows}))
        counts=collections.Counter(x["status"] for x in rows)
        self.assertEqual(CASE["assessment"]["counts"],dict(counts))
        self.assertTrue(all(x["source_deployment_bound"] is False for x in rows))

    def test_4_real_safe_tool_records(self):
        tools=load_jsonl(OUT/"hf-dataset/tools.jsonl")
        self.assertEqual(4,len(tools))
        self.assertEqual(set(CASE["scope"]["allowed_tools"]),{x["tool"] for x in tools})
        self.assertTrue(all(x["contract_inspected"] and x["success_path_invoked"] and x["public_read_only"] for x in tools))

    def test_noaa_difference_is_preserved(self):
        cases=load_jsonl(OUT/"hf-dataset/oracle.jsonl")
        self.assertEqual(3,len(cases))
        self.assertEqual(2,sum(x["match_at_capture"] for x in cases))
        difference=next(x for x in cases if not x["match_at_capture"])
        self.assertTrue(difference["volatile_instantaneous_data"])
        self.assertIn("flux differed",difference["interpretation"])

    def test_not_certified_or_deployed_source(self):
        j=json.loads((OUT/"hf-dataset/case_summary.json").read_text())
        self.assertEqual("NOT_ESTABLISHED",j["maturity_level"])
        self.assertFalse(j["production_source_bound"])
        self.assertFalse(j["full_protocol_certification"])
        self.assertEqual(1,j["real_agent_runs"])

    def test_no_private_identifiers_in_published_dataset(self):
        for f in (OUT/"hf-dataset").glob("*"):
            content=f.read_text()
            for secret in ("/Users/wahaha","C:\\Users\\","@world2.co","liang.rao@gmail.com","hf_"):
                self.assertNotIn(secret,content,f.name)

    def test_hf_space_is_static_interactive_and_39_rows(self):
        page=(OUT/"hf-space/index.html").read_text()
        self.assertIn('sdk: static',(OUT/"hf-space/README.md").read_text())
        self.assertIn('id="checksBody"',page)
        self.assertIn('id="copy"',page)
        self.assertIn('id="lang"',page)
        self.assertIn("navigator.clipboard.writeText",page)
        self.assertIn("Not a live MCP test",page)
        self.assertNotIn("ARE_EVIDENCE_DATA_PLACEHOLDER",page)
        j=json.loads(page.split('id="evidence">',1)[1].split("</script>",1)[0])
        self.assertEqual(39,len(j["checks"]))

    def test_demo_javascript_is_valid(self):
        page=(OUT/"hf-space/index.html").read_text()
        js=page.split("<script>\n",1)[1].split("</script>",1)[0]
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/"demo.js";p.write_text(js)
            result=subprocess.run(["node","--check",str(p)],capture_output=True,text=True)
            self.assertEqual(0,result.returncode,result.stderr)

    def test_canonical_static_site_has_dataset_and_demo(self):
        self.assertTrue((PUBLIC/"evidence/solarstorm/index.html").exists())
        self.assertTrue((PUBLIC/"datasets/solarstorm-20261116/index.html").exists())
        self.assertIn("/evidence/solarstorm/",(PUBLIC/"index.html").read_text())

    def test_media_fact_card_dimensions_and_video(self):
        for folder,shape in [("landscape",(1200,675)),("vertical",(1080,1920))]:
            for i in range(1,6):
                p=OUT/"media"/folder/(f"{i:02}.png")
                with p.open("rb") as f:
                    h=f.read(24)
                self.assertEqual(b"\x89PNG\r\n\x1a\n",h[:8])
                self.assertEqual(shape,struct.unpack(">II",h[16:24]))
        video=OUT/"media/solarstorm-are-15s-9x16.mp4"
        self.assertGreater(video.stat().st_size,80_000)
        with video.open("rb") as f: h=f.read(32)
        self.assertIn(b"ftyp",h)

    def test_channel_native_texts_are_distinct(self):
        paths=[
            "huggingface/SOLARSTORM_TECHNICAL_ARTICLE_EN.md",
            "modelscope/SOLARSTORM_CASE_ZH.md",
            "x/SOLARSTORM_THREAD_EN.md",
            "linkedin/SOLARSTORM_POST_EN.md",
            "reddit/SOLARSTORM_DISCUSSION_EN.md",
        ]
        texts=[(ROOT/"docs/channels"/p).read_text() for p in paths]
        self.assertEqual(5,len(set(texts)))
        for t in texts[:4]:
            self.assertIn("Solarstorm",t)
        self.assertIn("NOT_VERIFIED",texts[1])
        self.assertIn("not an official",texts[0].lower())
        self.assertNotIn("https://",texts[4].split("Body:",1)[1].split("Optional technical link",1)[0])

    def test_channel_status_does_not_claim_unverified_publications(self):
        status=json.loads((OUT/"channel_status.json").read_text())
        self.assertFalse(status["verified_urls"])
        self.assertNotEqual("PUBLISHED",status["publication_status"]["modelscope"])
        self.assertNotEqual("PUBLISHED",status["publication_status"]["huggingface_dataset"])
        self.assertNotEqual("PUBLISHED",status["publication_status"]["reddit"])

    def test_all_checksum_manifest_matches(self):
        hashes=json.loads((OUT/"sha256.json").read_text())
        import hashlib
        for name,expected in hashes.items():
            self.assertEqual(expected,hashlib.sha256((OUT/name).read_bytes()).hexdigest(),name)

if __name__=="__main__":
    unittest.main()
