import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from are_mcp_capture import main, save_capture, invoke_stdio

class ARECaptureTests(unittest.TestCase):
    def test_local_stdio_capture_outputs_schema_that_v5_accepts(self):
        with tempfile.TemporaryDirectory() as folder:
            script = (
                "import sys,json\n"
                "for line in sys.stdin:\n"
                " try:\n"
                "  request=json.loads(line)\n"
                " except:continue\n"
                " if request.get('id')==2:\n"
                "  print(json.dumps({'jsonrpc':'2.0','id':2,'result':{'tools':[{'name':'test_read'}]}}))\n"
            )
            path=Path(folder)/"capture.json"
            self.assertEqual(main(["--stdio-command-json",json.dumps([sys.executable,"-c",script]),
                "--out",str(path)]),0)
            artifact=json.loads(path.read_text())
            trace=json.loads(artifact["content"])
            self.assertEqual(artifact["kind"],"trace")
            self.assertEqual(trace["transport"],"stdio")
            self.assertEqual(trace["request"]["id"],trace["response"]["id"])
            self.assertIn("wire_request",trace)
            self.assertIn("wire_response",trace)
            self.assertEqual(os.stat(path).st_mode & 0o777,0o600)
    def test_rejects_overwriting_artifact(self):
        with tempfile.TemporaryDirectory() as folder:
            output=Path(folder)/"raw.json"
            output.write_text("original")
            req={"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}
            res={"jsonrpc":"2.0","id":1,"result":{"tools":[]}}
            with self.assertRaises(FileExistsError):
                save_capture(output,"stdio://test",req,json.dumps(req),json.dumps(res),res,"stdio")
            self.assertEqual(output.read_text(),"original")
    def test_sensitive_values_never_saved(self):
        with tempfile.TemporaryDirectory() as folder:
            output=Path(folder)/"raw.json"
            req={"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}
            res={"jsonrpc":"2.0","id":1,"result":{"content":"Bearer "+"A"*30}}
            with self.assertRaises(ValueError):
                save_capture(output,"stdio://test",req,json.dumps(req),json.dumps(res),res,"stdio")
            self.assertFalse(output.exists())
    def test_requires_explicit_permission_for_target_tool(self):
        with tempfile.TemporaryDirectory() as folder:
            args=["--stdio-command-json",json.dumps([sys.executable]),"--method","tools/call",
                "--tool","delete_everything","--arguments-json","{}", "--out",str(Path(folder)/"bad.json")]
            with self.assertRaises(SystemExit):
                main(args)
            self.assertFalse((Path(folder)/"bad.json").exists())

if __name__=="__main__":
    unittest.main()
