/**
 * Public read-only Neon Function API for ARE. No credentials leave the server.
 * Uses Neon's authenticated HTTP SQL proxy with the injected DATABASE_URL.
 * Only fixed read-only SQL statements are permitted here.
 */
const origins = new Set(["https://are.world2.co"]);
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
// Public API is a curated projection, not the internal research database.
// Only public GitHub research enters the directory. Local repos and internal
// batch schedules never appear, even when querying directly outside a browser.
export const PUBLIC_PORTFOLIO_SQL = `
SELECT json_build_object(
  'schema','are.public-portfolio.v2',
  'source','neon',
  'generated_at',now(),
  'publication_policy','github_public_metadata_plus_explicit_case',
  'assessments',(SELECT COALESCE(json_agg(q ORDER BY q.checked_at DESC,q.project_key),'[]'::json) FROM (
    SELECT project_key,display_name,'github_public'::text AS source_kind,
           CASE WHEN repo_url ~ '^https://github.com/[^/]+/[^/]+/?$' THEN repo_url ELSE NULL END AS repo_url,
           CASE WHEN project_key='mcp/solarstorm.today' THEN source_ref ELSE NULL END AS source_ref,
           category,status,checked_at,
           CASE WHEN project_key='mcp/solarstorm.today' THEN 'published_case' ELSE 'directory_only' END AS publication,
           CASE WHEN project_key='mcp/solarstorm.today' THEN 'zh-CN' ELSE 'none' END AS narrative_lang,
           CASE WHEN project_key='mcp/solarstorm.today' THEN summary ELSE '' END AS summary,
           CASE WHEN project_key='mcp/solarstorm.today' THEN strengths ELSE '[]'::jsonb END AS strengths,
           CASE WHEN project_key='mcp/solarstorm.today' THEN findings ELSE '[]'::jsonb END AS findings,
           CASE WHEN project_key='mcp/solarstorm.today' THEN dimensions ELSE '{}'::jsonb END AS dimensions,
           CASE WHEN project_key='mcp/solarstorm.today' THEN evidence ELSE '[]'::jsonb END AS evidence,
           NULL::text AS assessment_level
    FROM are_eval.assessments
    WHERE source_kind='github_public'
      AND status IN ('preliminary','source_review','verified')
    ORDER BY checked_at DESC,project_key LIMIT 500
  ) q),
  'batches','[]'::json,
  'internal_batches_exposed',false
)::text`;
const HEALTH_SQL = "SELECT json_build_object('ok',true,'source','neon','public_projects',(SELECT COUNT(*) FROM are_eval.assessments WHERE source_kind='github_public' AND status <> 'error'))::text";

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
      return respond(request,200,await readonlySql(path==="/v1/health"?HEALTH_SQL:PUBLIC_PORTFOLIO_SQL));
    } catch(e) {
      console.error("ARE read query:", String(e?.message||"unknown").slice(0,130));
      return respond(request,503,{error:"database_temporarily_unavailable"},{"Cache-Control":"no-store"});
    }
  }
};
