"""Offline regression of ARE multi-calendar operations parsing and gating."""
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("are_calendar_ops", Path(__file__).with_name("are_calendar_ops.py"))
assert spec and spec.loader
ops = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ops)

MAIL = "abcdef0123456789"
BASE = {
    "id": "synthetic-event-1", "summary": "[ARE][CHECK_REPLY] Test MCP",
    "status": "confirmed", "start": "2026-11-23T11:05:00+01:00",
    "description": (
        "ARE private follow-up queue. ARE_TASK_V1 "
        "key=are:solarstorm-mcp:check_reply project=solarstorm-\n"
        "mcp action=CHECK_REPLY state=WAITING_REPLY "
        "mail_thread=" + MAIL + " cadence=hourly_email "
        "safe=read_only send=manual_approval END_ARE_TASK."
    )
}


class CalendarOpsTests(unittest.TestCase):
    def test_parser_handles_google_reflow_inside_project(self):
        t = ops.parse_event(BASE)
        self.assertEqual("solarstorm-mcp", t["project_key"])
        self.assertEqual(MAIL, t["mail_thread"])

    def test_html_wrapping(self):
        t = ops.parse_event({**BASE, "description": "<p>" + BASE["description"] + "</p>"})
        self.assertEqual(MAIL, t["mail_thread"])

    def test_unrelated_and_run_logs_ignored(self):
        self.assertIsNone(ops.parse_event({"id":"log","summary":"[ARE_OPS_LOG] 2026-11-16","description":"run=2026-11-16T20"}))

    def test_missing_end_marker_blocked(self):
        with self.assertRaisesRegex(ValueError, "incomplete"):
            ops.parse_event({**BASE,"description":BASE["description"].replace("END_ARE_TASK","")})

    def test_no_unsafe_tools(self):
        with self.assertRaisesRegex(ValueError, "safety"):
            ops.parse_event({**BASE,"description":BASE["description"].replace("send=manual_approval","send=auto")})

    def test_id_must_be_thread_and_not_free_text(self):
        with self.assertRaisesRegex(ValueError, "thread"):
            ops.parse_event({**BASE,"description":BASE["description"].replace(MAIL,"YOUR_MESSAGE_ID")})

    def test_public_forum_action_without_mail(self):
        e={**BASE,"description":BASE["description"].replace("check_reply","check_public_reply").replace("CHECK_REPLY","CHECK_PUBLIC_REPLY").replace(MAIL,"NONE")}
        self.assertEqual("CHECK_PUBLIC_REPLY",ops.parse_event(e)["action"])

    def test_owner_review_action_not_an_outbound_send(self):
        desc=(BASE["description"].replace("check_reply","review_outreach")
              .replace("CHECK_REPLY","REVIEW_OUTREACH")
              .replace("WAITING_REPLY","PENDING_OUTREACH")
              .replace(MAIL,"NONE"))
        t=ops.parse_event({**BASE,"description":desc})
        self.assertEqual("REVIEW_OUTREACH",t["action"])
        self.assertEqual("NONE",t["mail_thread"])
        self.assertEqual(0,ops.plan([{**BASE,"description":desc}],
                                    "2026-11-16T20:00:00+01:00")["mail_task_count"])

    def test_same_project_action_cannot_repeat(self):
        with self.assertRaisesRegex(ValueError,"duplicate"):
            ops.collect_tasks([BASE,{**BASE,"id":"duplicate"}])

    def test_cancelled_ignored(self):
        self.assertEqual([],ops.collect_tasks([{**BASE,"status":"cancelled"}]))

    def test_11_messages_sent_do_not_mean_replied(self):
        result=ops.classify_thread({"thread_id":MAIL,"messages":[{"id":MAIL,"from_":"Liang RAO liang.rao@gmail.com"}]},
                                   {"liang.rao@gmail.com","liang.rao@world2.co","agent@world2.co"})
        self.assertEqual("NO_REPLY",result["state"])

    def test_external_actual_reply_is_review_required(self):
        res=ops.classify_thread({"thread_id":MAIL,"messages":[
            {"id":"aaaaaaaaaaaaaaaa","from_":"liang.rao@gmail.com"},
            {"id":"bbbbbbbbbbbbbbbb","from_":"maintainer@example.org"}
        ]},{"liang.rao@gmail.com"})
        self.assertEqual("POTENTIAL_REPLY",res["state"])
        self.assertEqual(["bbbbbbbbbbbbbbbb"],res["message_ids"])

    def test_failed_empty_mail_thread_is_unknown(self):
        self.assertEqual("UNKNOWN_THREAD",ops.classify_thread({"error":"GmailApiError"},{"liang.rao@gmail.com"})["state"])
        self.assertEqual("UNKNOWN_THREAD",ops.classify_thread({"thread_id":MAIL,"messages":[]},{"liang.rao@gmail.com"})["state"])

    def test_mailer_daemon_is_not_human(self):
        res=ops.classify_thread({"thread_id":MAIL,"messages":[
            {"id":MAIL,"from_":"liang.rao@gmail.com"},
            {"id":"cccccccccccccccc","from_":"mailer-daemon@example.org"}
        ]},{"liang.rao@gmail.com"})
        self.assertEqual("NO_REPLY",res["state"])

    def test_idempotent_hour_and_daily_weekly_gates(self):
        now="2026-11-16T20:12:00+01:00"  # Monday, Zurich
        x=ops.plan([BASE],now,"")
        self.assertEqual(1,x["mail_task_count"])
        self.assertTrue(x["daily_due_review"])
        self.assertTrue(x["weekly_review"])
        self.assertFalse(x["due_actions"]) # Nov 23 not yet due
        y=ops.plan([BASE],now,"run=2026-11-16T20 daily=2026-11-16 weekly=2026-W47")
        self.assertTrue(y["skipped_duplicate"])
        self.assertFalse(y["daily_due_review"])
        self.assertFalse(y["weekly_review"])

    def test_duplicate_hour_suppresses_daily_and_weekly_even_without_markers(self):
        e=ops.plan([BASE],"2026-11-16T20:12:00+01:00",
                   "run=2026-11-16T20")
        self.assertTrue(e["skipped_duplicate"])
        self.assertFalse(e["daily_due_review"])
        self.assertFalse(e["weekly_review"])

    def test_due_task_only_after_nine_zurich(self):
        e={**BASE,"start":"2026-11-15T11:05:00+01:00"}
        a=ops.plan([e],"2026-11-16T08:59:00+01:00")
        b=ops.plan([e],"2026-11-16T09:00:00+01:00")
        self.assertEqual([],a["due_actions"])
        self.assertEqual(["are:solarstorm-mcp:check_reply"],b["due_actions"])

    def test_utc_monday_local_conversion(self):
        self.assertEqual("run=2026-11-16T00",ops.run_key("2026-11-15T23:30:00Z"))


if __name__ == "__main__":
    unittest.main()
