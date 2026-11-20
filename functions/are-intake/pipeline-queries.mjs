// Private ARE V2 SQL. All queries are parameterized and return one JSON payload.
const q=(...lines)=>lines.join(" ");
export const POOL=q(
 "SELECT json_build_object('projects',COALESCE(json_agg(row_to_json(s)),'[]'::json))::text FROM (",
 "SELECT c.repository_key,c.display_name,COALESCE(p.decision,'UNFILTERED') decision,p.reason,p.tool_count,p.auth_mode,p.risk_level,p.priority,p.claimed_task_id,p.runtime_endpoint",
 "FROM are_eval.benchmark_study_candidates c LEFT JOIN are_eval.private_project_pool p ON p.cohort_id=c.cohort_id AND p.repository_key=c.repository_key",
 "WHERE c.cohort_id='ARE100-VALUE-20261115' ORDER BY c.repository_key LIMIT 150) s"
);
export const FILTER=q(
 "WITH x AS (INSERT INTO are_eval.private_project_pool",
 "(cohort_id,repository_key,decision,reason,tool_count,auth_mode,risk_level,runtime_endpoint,priority,updated_at)",
 "SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,now() FROM are_eval.benchmark_study_candidates c WHERE c.cohort_id=$1 AND c.repository_key=$2",
 "ON CONFLICT (cohort_id,repository_key) DO UPDATE SET",
 "decision=EXCLUDED.decision,reason=EXCLUDED.reason,tool_count=EXCLUDED.tool_count,auth_mode=EXCLUDED.auth_mode,",
 "risk_level=EXCLUDED.risk_level,runtime_endpoint=EXCLUDED.runtime_endpoint,priority=EXCLUDED.priority,updated_at=now()",
 "RETURNING repository_key,decision,reason,tool_count,auth_mode,risk_level,priority,claimed_task_id)",
 "SELECT COALESCE((SELECT row_to_json(x) FROM x),'null'::json)::text"
);
export const INVITE_CREATE=q(
 "WITH x AS (INSERT INTO are_eval.private_draw_invitations",
 "(invite_sha256,tester_id,tester_organization,label,max_draws,expires_at)",
 "VALUES ($1,$2,$3,$4,$5,now()+($6::integer*interval '1 day'))",
 "RETURNING id,tester_id,tester_organization,label,max_draws,expires_at)",
 "SELECT (SELECT row_to_json(x) FROM x)::text"
);
export const INVITES=q(
 "SELECT json_build_object('invites',COALESCE(json_agg(row_to_json(x)),'[]'::json))::text FROM",
 "(SELECT id,tester_id,label,max_draws,used_draws,expires_at,revoked_at,created_at",
 "FROM are_eval.private_draw_invitations ORDER BY created_at DESC LIMIT 100) x"
);
export const INVITE_REVOKE=q(
 "WITH x AS (UPDATE are_eval.private_draw_invitations SET revoked_at=now()",
 "WHERE id=$1::uuid AND revoked_at IS NULL RETURNING id,revoked_at)",
 "SELECT COALESCE((SELECT row_to_json(x) FROM x),'null'::json)::text"
);
export const DRAW=q(
 "WITH invited AS (SELECT id,tester_id,tester_organization FROM are_eval.private_draw_invitations",
 "WHERE invite_sha256=$1 AND expires_at>now() AND revoked_at IS NULL AND used_draws<max_draws FOR UPDATE),",
 "chosen AS (SELECT p.* FROM are_eval.private_project_pool p WHERE EXISTS(SELECT 1 FROM invited)",
 "AND p.decision='ELIGIBLE' AND p.claimed_task_id IS NULL",
 "AND $2::integer >= LEAST(240,GREATEST(60,60+CEIL(p.tool_count::numeric/10)*15+",
 "CASE WHEN p.auth_mode='OAUTH' THEN 20 ELSE 0 END+",
 "CASE p.risk_level WHEN 'HIGH' THEN 30 WHEN 'MEDIUM' THEN 15 ELSE 0 END))",
 "AND ($3::boolean OR p.auth_mode<>'OAUTH') ORDER BY p.priority DESC,random()",
 "LIMIT 1 FOR UPDATE OF p SKIP LOCKED),",
 "used AS (UPDATE are_eval.private_draw_invitations i SET used_draws=i.used_draws+1",
 "FROM invited v WHERE i.id=v.id AND EXISTS(SELECT 1 FROM chosen)",
 "RETURNING v.id,v.tester_id,v.tester_organization),",
 "created AS (INSERT INTO are_eval.private_assessment_tasks",
 "(cohort_id,repository_key,title,instructions,assignee_id,assessor_organization,token_sha256,expires_at,invite_id,plan_snapshot)",
 "SELECT p.cohort_id,p.repository_key,'ARE complete independent MCP evaluation',",
 "'Examine all tools safely and record evidence, OAuth and blocked-design issues.',",
 "u.tester_id,u.tester_organization,$4,now()+interval '7 days',u.id,",
 "jsonb_build_object('version','are.test-plan.v2','declared_tool_count',p.tool_count,",
 "'auth_mode',p.auth_mode,'risk_level',p.risk_level,",
 "'estimated_minutes',LEAST(240,GREATEST(60,60+CEIL(p.tool_count::numeric/10)*15+",
 "CASE WHEN p.auth_mode='OAUTH' THEN 20 ELSE 0 END+",
 "CASE p.risk_level WHEN 'HIGH' THEN 30 WHEN 'MEDIUM' THEN 15 ELSE 0 END)),",
 "'test_limit_minutes',$2::integer,'oauth_allowed',$3::boolean)",
 "FROM chosen p CROSS JOIN used u",
 "RETURNING id,cohort_id,repository_key,title,instructions,assignee_id,assessor_organization,expires_at,plan_snapshot),",
 "mark AS (UPDATE are_eval.private_project_pool p SET claimed_task_id=t.id,updated_at=now()",
 "FROM created t WHERE p.cohort_id=t.cohort_id AND p.repository_key=t.repository_key RETURNING t.id)",
 "SELECT COALESCE((SELECT row_to_json(t) FROM created t JOIN mark m ON m.id=t.id),'null'::json)::text"
);
export const TASK_LIST=q(
 "SELECT json_build_object('tasks',COALESCE(json_agg(row_to_json(x)),'[]'::json))::text FROM (",
 "SELECT t.id,t.repository_key,t.assignee_id,t.expires_at,t.revoked_at,t.created_at,t.plan_snapshot,",
 "p.phase,p.total_tools,p.minutes_used,",
 "(SELECT count(*)::integer FROM are_eval.private_task_submissions s WHERE s.task_id=t.id) submissions",
 "FROM are_eval.private_assessment_tasks t LEFT JOIN are_eval.private_task_progress p ON p.task_id=t.id",
 "WHERE t.invite_id IS NOT NULL ORDER BY t.created_at DESC LIMIT 150) x"
);
export const TASK_REVOKE=q(
 "WITH t AS (UPDATE are_eval.private_assessment_tasks SET revoked_at=now() WHERE id=$1::uuid",
 "AND invite_id IS NOT NULL AND revoked_at IS NULL RETURNING id,repository_key,cohort_id,revoked_at),",
 "p AS (UPDATE are_eval.private_project_pool p SET claimed_task_id=NULL,updated_at=now()",
 "FROM t WHERE p.claimed_task_id=t.id RETURNING p.repository_key)",
 "SELECT COALESCE((SELECT row_to_json(t) FROM t),'null'::json)::text"
);
export const CHECKPOINT=q(
 "WITH task AS (SELECT id FROM are_eval.private_assessment_tasks WHERE token_sha256=$1",
 "AND expires_at>now() AND revoked_at IS NULL AND invite_id IS NOT NULL FOR UPDATE),",
 "p AS (INSERT INTO are_eval.private_task_progress (task_id,coverage,blockers,phase,total_tools,minutes_used,updated_at)",
 "SELECT id,$2::jsonb,$3::jsonb,$4,$5::integer,$6::integer,now() FROM task",
 "ON CONFLICT (task_id) DO UPDATE SET coverage=EXCLUDED.coverage,blockers=EXCLUDED.blockers,",
 "phase=EXCLUDED.phase,total_tools=EXCLUDED.total_tools,minutes_used=EXCLUDED.minutes_used,updated_at=now()",
 "RETURNING phase,total_tools,minutes_used,updated_at)",
 "SELECT COALESCE((SELECT row_to_json(p) FROM p),'null'::json)::text"
);
export const CHECKPOINT_GET=q(
 "SELECT COALESCE((SELECT row_to_json(p) FROM (SELECT phase,total_tools,minutes_used,coverage,blockers,updated_at",
 "FROM are_eval.private_task_progress p JOIN are_eval.private_assessment_tasks t ON t.id=p.task_id",
 "WHERE t.token_sha256=$1 AND t.expires_at>now() AND t.revoked_at IS NULL AND t.invite_id IS NOT NULL) p),'null'::json)::text"
);
// QUEUE SQL defined separately below to keep all reports private and avoid dynamic table names.
export const REVIEWS=q(
 "SELECT json_build_object('runs',COALESCE(json_agg(row_to_json(x)),'[]'::json))::text FROM (",
 "SELECT r.id,r.repository_key,r.assessor_id,r.summary,r.created_at,r.state,",
 "r.decisive_count,r.verified_task_count,r.report->'tool_coverage' AS tool_coverage,",
 "r.report->'test_metadata' AS test_metadata,",
 "r.report->'test_blockers' AS blockers,s.task_id,t.plan_snapshot,",
 "(SELECT v.decision FROM are_eval.private_review_verdicts v WHERE v.run_id=r.id ORDER BY v.id DESC LIMIT 1) AS review,",
 "(SELECT p.status FROM are_eval.private_publication_drafts p WHERE p.run_id=r.id) AS publication",
 "FROM are_eval.private_evaluation_runs r",
 "JOIN are_eval.private_task_submissions s ON s.run_id=r.id",
 "JOIN are_eval.private_assessment_tasks t ON t.id=s.task_id",
 "WHERE t.invite_id IS NOT NULL ORDER BY r.created_at DESC LIMIT 100) x"
);
export const REVIEW_INSERT=q(
 "WITH x AS (INSERT INTO are_eval.private_review_verdicts (run_id,decision,explanation)",
 "SELECT r.id,$2,$3 FROM are_eval.private_evaluation_runs r",
 "JOIN are_eval.private_task_submissions s ON s.run_id=r.id",
 "JOIN are_eval.private_assessment_tasks t ON t.id=s.task_id",
 "WHERE r.id=$1::uuid AND t.invite_id IS NOT NULL RETURNING id,run_id,decision,created_at)",
 "SELECT COALESCE((SELECT row_to_json(x) FROM x),'null'::json)::text"
);
export const PUBLICATION_DRAFT=q(
 "WITH approved AS (SELECT v.run_id FROM are_eval.private_review_verdicts v",
 "WHERE v.run_id=$1::uuid AND v.decision='VERIFIED'",
 "AND NOT EXISTS(SELECT 1 FROM are_eval.private_review_verdicts k WHERE k.run_id=v.run_id AND k.id>v.id)),",
 "d AS (INSERT INTO are_eval.private_publication_drafts(run_id,status,summary)",
 "SELECT run_id,'DRAFT',$2 FROM approved ON CONFLICT(run_id) DO UPDATE SET summary=EXCLUDED.summary",
 "RETURNING run_id,status,summary)",
 "SELECT COALESCE((SELECT row_to_json(d) FROM d),'null'::json)::text"
);
export const PUBLICATION_APPROVE=q(
 "WITH approved AS (SELECT p.run_id FROM are_eval.private_publication_drafts p",
 "JOIN are_eval.private_review_verdicts v ON v.run_id=p.run_id",
 "WHERE p.run_id=$1::uuid AND p.status='DRAFT' AND v.decision='VERIFIED'",
 "AND NOT EXISTS(SELECT 1 FROM are_eval.private_review_verdicts x WHERE x.run_id=v.run_id AND x.id>v.id)),",
 "u AS (UPDATE are_eval.private_publication_drafts p SET status='APPROVED_FOR_MANUAL_RELEASE',",
 "owner_approved_at=now() FROM approved a WHERE p.run_id=a.run_id RETURNING p.run_id,p.status,p.owner_approved_at)",
 "SELECT COALESCE((SELECT row_to_json(u) FROM u),'null'::json)::text"
);
