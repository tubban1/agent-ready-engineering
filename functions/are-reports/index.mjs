/**
 * Public read-only Neon Function API for ARE. No credentials leave the server.
 * Uses Neon's authenticated HTTP SQL proxy with the injected DATABASE_URL.
 * Only fixed read-only SQL statements are permitted here.
 */
const origins = new Set(["https://are.world2.co","https://are.fde.fan","https://agent-ready-engineering.vercel.app"]);
function cors(request) {
  const supplied = request.headers.get("Origin");
  return origins.has(supplied)
    ? { "Access-Control-Allow-Origin": supplied, "Vary":"Origin" }
    : {};
}
function respond(req, status, obj, extra={}) {
  return new Response(JSON.stringify(obj), {status,headers:{
    "Content-Type":"application/json; charset=utf-8",
    "X-Content-Type-Options":"nosniff", "Cache-Control":"public, max-age=15, stale-while-revalidate=30",
    ...cors(req),...extra
  }});
}
async function readonlySql(query) {
  const conn = process.env.DATABASE_URL;
  if (!conn) throw Error("database_not_configured");
  const hostname = new URL(conn).hostname;
  if (!/\.neon\.tech$/.test(hostname)) throw Error("unsupported_database_endpoint");
  // Match the Neon serverless HTTP driver's default endpoint mapping.
  const endpoint = "https://" + hostname.replace(/^[^.]+\./, "api.") + "/sql";
  const response = await fetch(endpoint, {
    method:"POST",
    headers:{"Content-Type":"application/json","Neon-Connection-String":conn,
      "Neon-Raw-Text-Output":"true","Neon-Array-Mode":"true"},
    body:JSON.stringify({query,params:[]}),
    signal:AbortSignal.timeout(10000)
  });
  if (!response.ok) throw Error("neon_http_"+response.status);
  const data = await response.json();
  if (!Array.isArray(data.rows)||!data.rows[0]||!data.rows[0][0]) throw Error("unexpected_sql_result");
  return JSON.parse(data.rows[0][0]);
}
const PORTFOLIO_SQL = `
SELECT json_build_object(
  'schema','are.portfolio.v1',
  'source','neon',
  'generated_at',now(),
  'assessments',(SELECT COALESCE(json_agg(q ORDER BY q.checked_at DESC,q.project_key),'[]'::json) FROM (
    SELECT project_key,display_name,source_kind,repo_url,source_ref,category,
           status,CASE WHEN status='verified' THEN assessment_level ELSE NULL END AS assessment_level,
           title,summary,strengths,findings,dimensions,evidence,metrics,checked_at
    FROM are_eval.assessments ORDER BY checked_at DESC,project_key LIMIT 500
  ) q),
  'batches',(SELECT COALESCE(json_agg(b ORDER BY b.slot_at),'[]'::json) FROM (
    SELECT slot_at,target_count,status,discovered_count,analyzed_count,error_count,started_at,finished_at
    FROM are_eval.batches ORDER BY slot_at LIMIT 20
  ) b)
)::text`;
const HEALTH_SQL = "SELECT json_build_object('ok',true,'source','neon','assessments',(SELECT COUNT(*) FROM are_eval.assessments))::text";
export default {
  async fetch(request) {
    if (request.method==="OPTIONS")return new Response(null,{status:204,headers:{
      ...cors(request),"Access-Control-Allow-Methods":"GET, OPTIONS",
      "Access-Control-Allow-Headers":"Accept, Content-Type", "Access-Control-Max-Age":"600"
    }});
    if(request.method!=="GET")return respond(request,405,{error:"read_only"});
    const path=new URL(request.url).pathname;
    if(!["/","/v1/portfolio","/v1/health"].includes(path))return respond(request,404,{error:"not_found"});
    try {
      return respond(request,200,await readonlySql(path==="/v1/health"?HEALTH_SQL:PORTFOLIO_SQL));
    } catch(e) {
      console.error("ARE read query:", String(e?.message||"unknown").slice(0,130));
      return respond(request,503,{error:"database_temporarily_unavailable"},{"Cache-Control":"no-store"});
    }
  }
};
