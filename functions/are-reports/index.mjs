import { strongestVerifiedRelease, releaseProjection } from "./release_authority.mjs";
import { LEGACY_SOLARSTORM } from "./legacy_solarstorm.mjs";
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
  'publication_policy','directory_only_until_owner_signed_release',
  'assessments',(SELECT COALESCE(json_agg(q ORDER BY q.checked_at DESC,q.project_key),'[]'::json) FROM (
    SELECT project_key,display_name,'github_public'::text AS source_kind,
           CASE WHEN repo_url ~ '^https://github.com/[^/]+/[^/]+/?$' THEN repo_url ELSE NULL END AS repo_url,
           NULL::text AS source_ref,
           category,status,checked_at,
           'directory_only'::text AS publication,
           'none'::text AS narrative_lang,
           ''::text AS summary,
           '[]'::jsonb AS strengths,
           '[]'::jsonb AS findings,
           '{}'::jsonb AS dimensions,
           '[]'::jsonb AS evidence,
           NULL::text AS assessment_level
    FROM are_eval.assessments
    WHERE source_kind='github_public'
      AND status IN ('preliminary','source_review','verified')
    ORDER BY checked_at DESC,project_key LIMIT 500
  ) q),
  'batches','[]'::json,
  'internal_batches_exposed',false
)::text`;
// Signed events are append-only data, NOT permissions by themselves.
const APPROVAL_EVENTS_SQL = `
SELECT COALESCE(json_agg(q),'[]'::json)::text FROM (
 SELECT project_key,revision,key_id,payload_text,signature_b64
 FROM are_eval.public_release_events
 ORDER BY project_key,revision DESC LIMIT 3000
) q`;
function releaseKeys() {
  const raw=process.env.ARE_OWNER_RELEASE_PUBLIC_KEYS_JSON || "{}";
  const keys=JSON.parse(raw);
  if (!keys || typeof keys !== "object" || Array.isArray(keys)) throw Error("invalid_verifier_keys");
  return keys;
}
async function getVerifiedPublicPortfolio() {
  const [portfolio,events]=await Promise.all([readonlySql(PUBLIC_PORTFOLIO_SQL),readonlySql(APPROVAL_EVENTS_SQL)]);
  if (!Array.isArray(portfolio.assessments) || !Array.isArray(events)) throw Error("invalid_portfolio_projection");
  const keys=releaseKeys();
  const eventsByKey=new Map();
  for (const record of events) {
    if (!eventsByKey.has(record.project_key)) eventsByKey.set(record.project_key,[]);
    eventsByKey.get(record.project_key).push(record);
  }
  portfolio.assessments=portfolio.assessments.map(row=>{
    const approved=strongestVerifiedRelease(eventsByKey.get(row.project_key),keys,row.project_key);
    const projected=releaseProjection(row,approved);
    // Grandfather only this independently published 2026-11-16 case,
    // never by copying the mutable research-row summary/findings.
    if (row.project_key === LEGACY_SOLARSTORM.project_key && !approved)
      return {...projected,...LEGACY_SOLARSTORM};
    return projected;
  });
  portfolio.publication_policy="owner_signed_exact_payload_or_frozen_legacy";
  return portfolio;
}
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
      return respond(request,200,path==="/v1/health"?await readonlySql(HEALTH_SQL):await getVerifiedPublicPortfolio());
    } catch(e) {
      console.error("ARE read query:", String(e?.message||"unknown").slice(0,130));
      return respond(request,503,{error:"database_temporarily_unavailable"},{"Cache-Control":"no-store"});
    }
  }
};
