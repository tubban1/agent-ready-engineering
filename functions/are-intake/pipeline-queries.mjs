// Private ARE V2 SQL. All queries are parameterized and return one JSON payload.
const q=(...lines)=>lines.join(" ");
export const POOL=q(
 "SELECT json_build_object('projects',COALESCE(json_agg(row_to_json(s)),'[]'::json))::text FROM (",
 "SELECT c.repository_key,c.display_name,COALESCE(p.decision,'UNFILTERED') decision,p.reason,p.tool_count,p.auth_mode,p.risk_level,p.priority,p.claimed_task_id,p.runtime_endpoint,",
 "p.quality_score,p.quality_breakdown,p.quality_evidence,c.repository_match_verified,c.creator_contact_verified,",
 "c.repository_match_evidence,c.creator_contact_evidence",
 "FROM are_eval.benchmark_study_candidates c LEFT JOIN are_eval.private_project_pool p ON p.cohort_id=c.cohort_id AND p.repository_key=c.repository_key",
 "WHERE c.cohort_id='ARE100-VALUE-20261115' ORDER BY c.repository_key LIMIT 150) s"
);
export const FILTER=q(
 "WITH x AS (INSERT INTO are_eval.private_project_pool",
 "(cohort_id,repository_key,decision,reason,tool_count,auth_mode,risk_level,runtime_endpoint,priority,updated_at)",
 "SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,now() FROM are_eval.benchmark_study_candidates c WHERE c.cohort_id=$1 AND c.repository_key=$2",
 "AND ($3<>'ELIGIBLE' OR (c.repository_match_verified=true AND EXISTS (",
 "SELECT 1 FROM are_eval.private_project_pool existing WHERE existing.cohort_id=$1",
 "AND existing.repository_key=$2 AND existing.quality_score>=75)))",
 "ON CONFLICT (cohort_id,repository_key) DO UPDATE SET",
 "decision=EXCLUDED.decision,reason=EXCLUDED.reason,tool_count=EXCLUDED.tool_count,auth_mode=EXCLUDED.auth_mode,",
 "risk_level=EXCLUDED.risk_level,runtime_endpoint=EXCLUDED.runtime_endpoint,priority=EXCLUDED.priority,updated_at=now()",
 "RETURNING repository_key,decision,reason,tool_count,auth_mode,risk_level,priority,claimed_task_id)",
 "SELECT COALESCE((SELECT row_to_json(x) FROM x),'null'::json)::text"
);
export const ISSUE=q(
 "WITH chosen AS (SELECT p.cohort_id,p.repository_key,p.tool_count,p.auth_mode,p.risk_level,p.runtime_endpoint",
 "FROM are_eval.private_project_pool p WHERE p.cohort_id='ARE100-VALUE-20261115'",
 "AND p.repository_key=$1 AND p.decision='ELIGIBLE' AND p.claimed_task_id IS NULL",
 "AND p.quality_score>=75 AND EXISTS (SELECT 1 FROM are_eval.benchmark_study_candidates c",
 "WHERE c.cohort_id=p.cohort_id AND c.repository_key=p.repository_key AND c.repository_match_verified)",
 "FOR UPDATE OF p),",
 "created AS (INSERT INTO are_eval.private_assessment_tasks",
 "(cohort_id,repository_key,title,instructions,assignee_id,assessor_organization,token_sha256,expires_at,plan_snapshot)",
 "SELECT p.cohort_id,p.repository_key,'ARE complete independent MCP evaluation',",
 "'Cover all authorized tools; record OAuth, time budgets and BLOCKED_DESIGN with traces',",
 "$2,$3,$4,now()+($5::integer*interval '1 day'),",
 "jsonb_build_object('version','are.test-plan.v3','declared_tool_count',p.tool_count,'runtime_endpoint',p.runtime_endpoint,",
 "'auth_mode',p.auth_mode,'risk_level',p.risk_level,",
 "'estimated_minutes',LEAST(240,GREATEST(60,60+CEIL(p.tool_count::numeric/10)*15+",
 "CASE WHEN p.auth_mode='OAUTH' THEN 20 ELSE 0 END+",
 "CASE p.risk_level WHEN 'HIGH' THEN 30 WHEN 'MEDIUM' THEN 15 ELSE 0 END)),",
 "'test_limit_minutes',$6::integer,'oauth_allowed',$7::boolean)",
 "FROM chosen p",
 "WHERE $6::integer >= LEAST(240,GREATEST(60,60+CEIL(p.tool_count::numeric/10)*15+",
 "CASE WHEN p.auth_mode='OAUTH' THEN 20 ELSE 0 END+",
 "CASE p.risk_level WHEN 'HIGH' THEN 30 WHEN 'MEDIUM' THEN 15 ELSE 0 END))",
 "AND ($7::boolean OR p.auth_mode<>'OAUTH')",
 "RETURNING id,cohort_id,repository_key,title,instructions,assignee_id,assessor_organization,expires_at,created_at,plan_snapshot),",
 "claimed AS (UPDATE are_eval.private_project_pool p SET claimed_task_id=c.id,updated_at=now()",
 "FROM created c WHERE p.cohort_id=c.cohort_id AND p.repository_key=c.repository_key RETURNING c.id)",
 "SELECT COALESCE((SELECT row_to_json(c) FROM created c JOIN claimed x ON x.id=c.id),'null'::json)::text"
);
export const TASK_LIST=q(
 "SELECT json_build_object('tasks',COALESCE(json_agg(row_to_json(x)),'[]'::json))::text FROM (",
 "SELECT t.id,t.repository_key,t.assignee_id,t.expires_at,t.revoked_at,t.created_at,t.plan_snapshot,",
 "p.phase,p.total_tools,p.minutes_used,",
 "(SELECT row_to_json(a) FROM (SELECT ar.decision,ar.reason,ar.requested_scopes,ar.requested_at",
 "FROM are_eval.private_task_authorization_requests ar WHERE ar.task_id=t.id) a) authorization_request,",
 "(SELECT count(*)::integer FROM are_eval.private_task_submissions s WHERE s.task_id=t.id) submissions",
 "FROM are_eval.private_assessment_tasks t LEFT JOIN are_eval.private_task_progress p ON p.task_id=t.id",
 "WHERE t.plan_snapshot->>'version' = 'are.test-plan.v3' ORDER BY t.created_at DESC LIMIT 150) x"
);
export const TASK_REVOKE=q(
 "WITH t AS (UPDATE are_eval.private_assessment_tasks SET revoked_at=now() WHERE id=$1::uuid",
 "AND plan_snapshot->>'version'='are.test-plan.v3' AND revoked_at IS NULL RETURNING id,repository_key,cohort_id,revoked_at),",
 "p AS (UPDATE are_eval.private_project_pool p SET claimed_task_id=NULL,updated_at=now()",
 "FROM t WHERE p.claimed_task_id=t.id RETURNING p.repository_key)",
 "SELECT COALESCE((SELECT row_to_json(t) FROM t),'null'::json)::text"
);
export const CHECKPOINT=q(
 "WITH task AS (SELECT id FROM are_eval.private_assessment_tasks WHERE token_sha256=$1",
 "AND expires_at>now() AND revoked_at IS NULL AND plan_snapshot->>'version'='are.test-plan.v3' FOR UPDATE),",
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
 "WHERE t.token_sha256=$1 AND t.expires_at>now() AND t.revoked_at IS NULL AND t.plan_snapshot->>'version'='are.test-plan.v3') p),'null'::json)::text"
);
// QUEUE SQL defined separately below to keep all reports private and avoid dynamic table names.
export const REVIEWS=q(
 "SELECT json_build_object('runs',COALESCE(json_agg(row_to_json(x)),'[]'::json))::text FROM (",
 "SELECT r.id,r.repository_key,r.assessor_id,r.summary,r.created_at,r.state,",
 "r.decisive_count,r.verified_task_count,r.report->'tool_coverage' AS tool_coverage,",
 "r.report->'test_metadata' AS test_metadata,",
 "r.report->'test_blockers' AS blockers, r.report->'evidence_artifacts' AS evidence_artifacts,",
 "r.report->'findings' AS findings,r.report->>'integrity_readiness' AS integrity_readiness,",
 "r.report->'integrity_metrics' AS integrity_metrics,r.report->'test_completion' AS test_completion,r.source_binding,r.agent_tasks,s.task_id,t.plan_snapshot,",
 "(SELECT v.decision FROM are_eval.private_review_verdicts v WHERE v.run_id=r.id ORDER BY v.id DESC LIMIT 1) AS review,",
 "(SELECT p.status FROM are_eval.private_publication_drafts p WHERE p.run_id=r.id) AS publication",
 "FROM are_eval.private_evaluation_runs r",
 "JOIN are_eval.private_task_submissions s ON s.run_id=r.id",
 "JOIN are_eval.private_assessment_tasks t ON t.id=s.task_id",
 "WHERE t.plan_snapshot->>'version'='are.test-plan.v3' ORDER BY r.created_at DESC LIMIT 100) x"
);
export const REVIEW_INSERT=q(
 "WITH x AS (INSERT INTO are_eval.private_review_verdicts (run_id,decision,explanation)",
 "SELECT r.id,$2,$3 FROM are_eval.private_evaluation_runs r",
 "JOIN are_eval.private_task_submissions s ON s.run_id=r.id",
 "JOIN are_eval.private_assessment_tasks t ON t.id=s.task_id",
 "WHERE r.id=$1::uuid AND t.plan_snapshot->>'version'='are.test-plan.v3' RETURNING id,run_id,decision,created_at),",
 "consumed AS (UPDATE are_eval.private_assessment_tasks t SET revoked_at=now()",
 "FROM are_eval.private_task_submissions l JOIN x ON l.run_id=x.run_id",
 "WHERE t.id=l.task_id AND x.decision='VERIFIED' AND t.revoked_at IS NULL RETURNING t.id)",
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

// Tester-facing read model: only screened public repository metadata, never private evidence or tokens.
export const PUBLIC_POOL=q(
 "WITH x AS (SELECT p.repository_key,c.display_name,p.tool_count,p.auth_mode,p.risk_level,p.priority,p.runtime_endpoint,",
 "p.quality_score,c.repository_match_verified,c.creator_contact_verified,",
 "CASE WHEN EXISTS (SELECT 1 FROM are_eval.private_task_submissions s",
 "JOIN are_eval.private_review_verdicts v ON v.run_id=s.run_id",
 "JOIN are_eval.private_assessment_tasks completed ON completed.id=s.task_id",
 "WHERE completed.cohort_id=p.cohort_id AND completed.repository_key=p.repository_key AND v.decision='VERIFIED') THEN 'REVIEWED'",
 "WHEN p.claimed_task_id IS NULL THEN 'AVAILABLE'",
 "WHEN t.id IS NOT NULL AND t.revoked_at IS NULL AND t.expires_at>now() THEN 'CLAIMED'",
 "ELSE 'AVAILABLE' END AS availability",
 "FROM are_eval.private_project_pool p JOIN are_eval.benchmark_study_candidates c",
 "ON c.cohort_id=p.cohort_id AND c.repository_key=p.repository_key",
 "LEFT JOIN are_eval.private_assessment_tasks t ON t.id=p.claimed_task_id",
 "WHERE p.cohort_id='ARE100-VALUE-20261115' AND p.decision='ELIGIBLE'",
 "AND p.quality_score>=75 AND c.repository_match_verified),",
 "stats AS (SELECT",
 "(SELECT count(*)::int FROM are_eval.benchmark_study_candidates WHERE cohort_id='ARE100-VALUE-20261115') AS candidate_total,",
 "(SELECT count(*)::int FROM are_eval.private_project_pool WHERE cohort_id='ARE100-VALUE-20261115' AND decision='HOLD') AS held,",
 "(SELECT count(*)::int FROM are_eval.private_project_pool WHERE cohort_id='ARE100-VALUE-20261115' AND decision='EXCLUDED') AS excluded)",
 "SELECT json_build_object('projects',COALESCE((SELECT json_agg(row_to_json(y)) FROM",
 "(SELECT * FROM x ORDER BY priority DESC, repository_key LIMIT 150) y),'[]'::json),",
 "'stats',json_build_object('candidates',(SELECT candidate_total FROM stats),'held',(SELECT held FROM stats),",
 "'excluded',(SELECT excluded FROM stats),'eligible',(SELECT count(*) FROM x),",
 "'available',(SELECT count(*) FROM x WHERE availability='AVAILABLE'),",
 "'claimed',(SELECT count(*) FROM x WHERE availability='CLAIMED')))::text"
);

// An unprivileged, short-lived browser session is NOT an authenticated identity.
// Bound to Secure HttpOnly SameSite cookie; keeps a tester's parallel-claim quota.
export const TESTER_SESSION_CREATE=q(
 "WITH lockrow AS MATERIALIZED (SELECT pg_advisory_xact_lock(193751,20261120) AS locked),",
 "s AS (INSERT INTO are_eval.private_tester_sessions",
 "(session_sha256,tester_id,display_name,organization,expires_at)",
 "SELECT $1,('tester_'||substring(replace(gen_random_uuid()::text,'-',''),1,20)),$2,$3,now()+interval '14 days'",
 "FROM lockrow WHERE (SELECT count(*) FROM are_eval.private_tester_sessions",
 "WHERE created_at>now()-interval '24 hours')<60",
 "RETURNING id,tester_id,display_name,organization,created_at,expires_at)",
 "SELECT COALESCE((SELECT row_to_json(s) FROM s),'null'::json)::text"
);
export const TESTER_SESSION_READ=q(
 "SELECT COALESCE((SELECT row_to_json(s) FROM (",
 "SELECT id,tester_id,display_name,organization,created_at,expires_at",
 "FROM are_eval.private_tester_sessions",
 "WHERE session_sha256=$1 AND expires_at>now()) s),'null'::json)::text"
);
export const TESTER_MY_TASKS=q(
 "SELECT json_build_object('tasks',COALESCE(json_agg(row_to_json(x)),'[]'::json))::text FROM (",
 "SELECT t.id,t.repository_key,t.created_at,t.expires_at,t.revoked_at,",
 "t.plan_snapshot->>'auth_mode' AS auth_mode,t.plan_snapshot->>'runtime_endpoint' AS endpoint,",
 "p.phase,p.total_tools,p.minutes_used,p.updated_at AS last_checkpoint_at,",
 " (SELECT row_to_json(a) FROM (SELECT ar.decision,ar.reason,ar.requested_scopes,ar.requested_at,ar.decided_at",
 " FROM are_eval.private_task_authorization_requests ar WHERE ar.task_id=t.id) a) AS authorization_request,",
 "(SELECT count(*)::integer FROM are_eval.private_task_submissions l WHERE l.task_id=t.id) submissions,",
 "COALESCE((SELECT json_agg(row_to_json(z) ORDER BY z.submitted_at DESC) FROM (",
 "SELECT r.id AS submission_id,l.created_at AS submitted_at,r.state AS evidence_state,",
 "r.decisive_count,r.verified_task_count,",
 "rv.decision AS review_decision,rv.explanation AS review_reason,rv.created_at AS reviewed_at,",
 "(SELECT COALESCE(jsonb_object_agg(k.status,k.n),'{}'::jsonb) FROM (",
 "SELECT x->>'status' AS status,count(*)::integer AS n",
 "FROM jsonb_array_elements(COALESCE(r.report->'findings','[]'::jsonb)) x GROUP BY x->>'status') k) AS criteria_counts,",
 "(SELECT COALESCE(jsonb_object_agg(k.status,k.n),'{}'::jsonb) FROM (",
 "SELECT x->>'status' AS status,count(*)::integer AS n",
 "FROM jsonb_array_elements(COALESCE(r.report->'tool_coverage','[]'::jsonb)) x GROUP BY x->>'status') k) AS tool_counts,",
 "jsonb_array_length(COALESCE(r.report->'tool_coverage','[]'::jsonb)) AS total_tools,",
 "r.report->>'integrity_readiness' AS integrity_readiness,",
 "r.report->'test_completion' AS test_completion",
 "FROM are_eval.private_task_submissions l JOIN are_eval.private_evaluation_runs r ON r.id=l.run_id",
 "LEFT JOIN LATERAL (SELECT v.decision,v.explanation,v.created_at FROM are_eval.private_review_verdicts v",
 "WHERE v.run_id=r.id ORDER BY v.id DESC LIMIT 1) rv ON true",
 "WHERE l.task_id=t.id ORDER BY l.created_at DESC LIMIT 25) z),'[]'::json) AS receipts",
 "FROM are_eval.private_assessment_tasks t",
 "JOIN are_eval.private_tester_sessions s ON s.id::text=t.plan_snapshot->>'tester_session_id'",
 "LEFT JOIN are_eval.private_task_progress p ON p.task_id=t.id",
 "WHERE s.session_sha256=$1 AND s.expires_at>now()",
 "ORDER BY t.created_at DESC LIMIT 50) x"
);
// The existing task ID, expiry, checkpoints, captures and submissions remain unchanged.
// Only an explicitly initiated and session-owned credential rotation is allowed.
export const TESTER_ROTATE_TASK=q(
 "WITH owned AS MATERIALIZED (SELECT t.id FROM are_eval.private_assessment_tasks t",
 "JOIN are_eval.private_tester_sessions s ON s.id::text=t.plan_snapshot->>'tester_session_id'",
 "WHERE s.session_sha256=$1 AND s.expires_at>now() AND t.id=$2::uuid",
 "AND t.revoked_at IS NULL AND t.expires_at>now()",
 "AND t.plan_snapshot->>'version'='are.test-plan.v3'",
 "AND (NOT (t.plan_snapshot ? 'token_rotated_at') OR",
 "NULLIF(t.plan_snapshot->>'token_rotated_at','')::timestamptz<now()-interval '1 minute')",
 "FOR UPDATE OF t),",
 "rotated AS (UPDATE are_eval.private_assessment_tasks t SET token_sha256=$3,",
 "plan_snapshot=jsonb_set(t.plan_snapshot,'{token_rotated_at}',to_jsonb(now()::text),true)",
 "FROM owned WHERE t.id=owned.id RETURNING t.id,t.repository_key,t.assignee_id,",
 "t.assessor_organization,t.created_at,t.expires_at,t.plan_snapshot)",
 "SELECT COALESCE((SELECT row_to_json(rotated) FROM rotated),'null'::json)::text"
);

export const PUBLIC_CLAIM=q(
 "WITH session AS MATERIALIZED (SELECT id,tester_id,organization FROM are_eval.private_tester_sessions",
 "WHERE session_sha256=$1 AND expires_at>now() FOR UPDATE),",
 "eligible AS (SELECT p.cohort_id,p.repository_key,p.tool_count,p.auth_mode,p.risk_level,p.runtime_endpoint,p.priority",
 "FROM are_eval.private_project_pool p LEFT JOIN are_eval.private_assessment_tasks prior ON prior.id=p.claimed_task_id",
 "WHERE p.cohort_id='ARE100-VALUE-20261115' AND p.decision='ELIGIBLE'",
 "AND p.quality_score>=75 AND EXISTS (SELECT 1 FROM are_eval.benchmark_study_candidates c",
 "WHERE c.cohort_id=p.cohort_id AND c.repository_key=p.repository_key AND c.repository_match_verified)",
 "AND ($2::text='' OR p.repository_key=$2)",
 "AND (p.claimed_task_id IS NULL OR prior.id IS NULL OR prior.revoked_at IS NOT NULL OR prior.expires_at<=now())",
 "AND NOT EXISTS (SELECT 1 FROM are_eval.private_task_submissions s",
 "JOIN are_eval.private_review_verdicts v ON v.run_id=s.run_id",
 "JOIN are_eval.private_assessment_tasks previous ON previous.id=s.task_id",
 "WHERE previous.cohort_id=p.cohort_id AND previous.repository_key=p.repository_key AND v.decision='VERIFIED')",
 "AND $4::integer >= LEAST(240,GREATEST(60,60+CEIL(p.tool_count::numeric/10)*15+",
 "CASE WHEN p.auth_mode='OAUTH' THEN 20 ELSE 0 END+",
 "CASE p.risk_level WHEN 'HIGH' THEN 30 WHEN 'MEDIUM' THEN 15 ELSE 0 END))",
 "AND ($5::boolean OR p.auth_mode<>'OAUTH')",
 "ORDER BY p.priority DESC,p.repository_key FOR UPDATE OF p SKIP LOCKED LIMIT 1),",
 "created AS (INSERT INTO are_eval.private_assessment_tasks",
 "(cohort_id,repository_key,title,instructions,assignee_id,assessor_organization,token_sha256,expires_at,plan_snapshot)",
 "SELECT p.cohort_id,p.repository_key,'ARE independent self-serve MCP evaluation',",
 "'Test all safely authorized tools; evidence-first private submission, owner review required',",
 "s.tester_id,s.organization,$3,now()+interval '48 hours',",
 "jsonb_build_object('version','are.test-plan.v3','tester_session_id',s.id::text,'self_draw',true,",
 "'declared_tool_count',p.tool_count,'runtime_endpoint',p.runtime_endpoint,",
 "'auth_mode',p.auth_mode,'risk_level',p.risk_level,",
 "'estimated_minutes',LEAST(240,GREATEST(60,60+CEIL(p.tool_count::numeric/10)*15+",
 "CASE WHEN p.auth_mode='OAUTH' THEN 20 ELSE 0 END+",
 "CASE p.risk_level WHEN 'HIGH' THEN 30 WHEN 'MEDIUM' THEN 15 ELSE 0 END)),",
 "'test_limit_minutes',$4::integer,'oauth_allowed',$5::boolean)",
 "FROM eligible p CROSS JOIN session s",
 "WHERE (SELECT count(*) FROM are_eval.private_assessment_tasks a",
 "WHERE a.plan_snapshot->>'tester_session_id'=s.id::text AND a.revoked_at IS NULL AND a.expires_at>now()",
 "AND NOT EXISTS (SELECT 1 FROM are_eval.private_task_submissions l WHERE l.task_id=a.id)) < 3",
 "AND (SELECT count(*) FROM are_eval.private_assessment_tasks a",
 "WHERE a.plan_snapshot->>'tester_session_id'=s.id::text AND a.created_at>now()-interval '24 hours') < 6",
 "AND (SELECT count(*) FROM are_eval.private_assessment_tasks a",
 "WHERE a.plan_snapshot->>'self_draw'='true' AND a.created_at>now()-interval '1 hour') < 12",
 "RETURNING id,cohort_id,repository_key,title,instructions,assignee_id,assessor_organization,expires_at,created_at,plan_snapshot),",
 "claimed AS (UPDATE are_eval.private_project_pool p SET claimed_task_id=c.id,updated_at=now()",
 "FROM created c WHERE p.cohort_id=c.cohort_id AND p.repository_key=c.repository_key RETURNING c.id)",
 "SELECT COALESCE((SELECT row_to_json(c) FROM created c JOIN claimed x ON c.id=x.id),'null'::json)::text"
);

// Owner-only evidence review: no user-submitted boolean can directly set verification flags.
export const SCREEN_TARGET=q(
 "SELECT COALESCE((SELECT row_to_json(x) FROM (SELECT c.repository_key,p.runtime_endpoint",
 "FROM are_eval.benchmark_study_candidates c JOIN are_eval.private_project_pool p",
 "ON p.cohort_id=c.cohort_id AND p.repository_key=c.repository_key",
 "WHERE c.cohort_id='ARE100-VALUE-20261115' AND c.repository_key=$1) x),'null'::json)::text"
);
export const SCREEN_SAVE=q(
 "WITH target AS (SELECT p.repository_key FROM are_eval.private_project_pool p",
 "WHERE p.cohort_id='ARE100-VALUE-20261115' AND p.repository_key=$1 AND p.runtime_endpoint=$2),",
 "saved AS (UPDATE are_eval.benchmark_study_candidates c SET repository_match_verified=$3::boolean,",
 "creator_contact_verified=$4::boolean,repository_match_evidence=$5::jsonb,creator_contact_evidence=$6::jsonb",
 "FROM target t WHERE c.cohort_id='ARE100-VALUE-20261115' AND c.repository_key=t.repository_key",
 "RETURNING c.repository_key,c.repository_match_verified,c.creator_contact_verified,",
 "c.repository_match_evidence,c.creator_contact_evidence)",
 "SELECT COALESCE((SELECT row_to_json(saved) FROM saved),'null'::json)::text"
);
export const QUALITY_SAVE=q(
 "WITH changed AS (UPDATE are_eval.private_project_pool p SET quality_score=$2::integer,",
 "quality_breakdown=$3::jsonb,quality_evidence=$4::jsonb,updated_at=now()",
 "WHERE p.cohort_id='ARE100-VALUE-20261115' AND p.repository_key=$1",
 "RETURNING repository_key,quality_score,quality_breakdown,quality_evidence)",
 "SELECT COALESCE((SELECT row_to_json(changed) FROM changed),'null'::json)::text"
);
