import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { verifySignedRelease, strongestVerifiedRelease, releaseProjection } from "./release_authority.mjs";
import { LEGACY_SOLARSTORM } from "./legacy_solarstorm.mjs";

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const keys = { "owner-v1": publicKey.export({type:"spki",format:"pem"}) };
const source = {
  project_key: "mcp/example.test", display_name: "Synthetic Example",
  source_kind: "github_public", publication: "published_case",
  summary: "UNVERIFIED injected database claims", findings: ["not approved"],
  strengths: ["not approved"], evidence: [{url:"https://example.test/"}],
  assessment_level: "L4", repo_url:"https://github.com/example/test",
};
function payload(revision=1, decision="PUBLISH") {
  return {
    schema: "are.owner-signed-public-release.v1", project_key: source.project_key,
    revision, decision, owner_reviewer:"reviewer-outside-agent",
    approved_at:"2026-11-18T21:30:00Z", reason:"Independently reviewed reproducible report",
    source_revision:"sha256:abcd", case_sha256:"a".repeat(64),
    case_url:"https://are.world2.co/evidence/example/",
    summary:"Approved, limited public finding",
    strengths:["Tool call works in a synthetic test"],
    findings:["One bounded unknown remains"],
    evidence:[{url:"https://github.com/tubban1/agent-ready-engineering"}]
  };
}
function signed(p) {
  const text = JSON.stringify(p);
  return {project_key:source.project_key, revision:p.revision,
    key_id:"owner-v1",payload_text:text,
    signature_b64:sign(null,Buffer.from(text),privateKey).toString("base64")};
}

test("database row without signed owner approval never exposes findings or a grade", () => {
  const out=releaseProjection(source,null);
  assert.equal(out.publication,"directory_only");
  assert.deepEqual(out.findings,[]);
  assert.deepEqual(out.strengths,[]);
  assert.equal(out.summary,"");
  assert.equal(out.assessment_level,null);
});

test("valid signed revision permits only its exact public payload", () => {
  const checked=verifySignedRelease(signed(payload()),keys,source.project_key);
  assert.equal(checked?.summary,"Approved, limited public finding");
  const out=releaseProjection(source,checked);
  assert.equal(out.publication,"published_case");
  assert.deepEqual(out.findings,["One bounded unknown remains"]);
  assert.equal(out.assessment_level,null);
});

test("DB writer cannot forge signed content by modifying payload", () => {
  const row=signed(payload());
  row.payload_text=row.payload_text.replace("Approved, limited", "Manipulated unreviewed");
  assert.equal(verifySignedRelease(row,keys,source.project_key),null);
});

test("DB writer cannot make another project or code revision public", () => {
  const row=signed(payload());
  assert.equal(verifySignedRelease(row,keys,"mcp/other.test"),null);
  assert.equal(verifySignedRelease({...row,signature_b64:"invalid"},keys,source.project_key),null);
  assert.equal(verifySignedRelease({...row,key_id:"unknown"},keys,source.project_key),null);
});

test("invalid high-revision junk cannot override older signed approval", () => {
  const good=signed(payload(1));
  const junk={...signed(payload(99)),signature_b64:"corrupt"};
  assert.equal(strongestVerifiedRelease([junk,good],keys,source.project_key)?.revision,1);
});

test("owner-signed revocation suppresses previously signed release", () => {
  const rows=[signed(payload(2,"REVOKE")),signed(payload(1))];
  const checked=strongestVerifiedRelease(rows,keys,source.project_key);
  assert.equal(checked.decision,"REVOKE");
  assert.equal(releaseProjection(source,checked).publication,"directory_only");
});

test("no signing key configured means no new public releases", () => {
  assert.equal(strongestVerifiedRelease([signed(payload())],{},source.project_key),null);
});

test("legacy Solarstorm content comes from frozen source, not DB research row", () => {
  assert.equal(LEGACY_SOLARSTORM.project_key,"mcp/solarstorm.today");
  assert.equal(LEGACY_SOLARSTORM.publication,"published_case");
  assert.equal(LEGACY_SOLARSTORM.assessment_level,null);
  assert.ok(LEGACY_SOLARSTORM.findings.length>0);
});

test("public Function query does not reflect any mutable research-row findings", () => {
  const source=readFileSync(new URL("./index.mjs",import.meta.url),"utf8");
  assert.ok(source.includes("getVerifiedPublicPortfolio"));
  assert.ok(source.includes("readonlySql(APPROVAL_EVENTS_SQL)"));
  assert.ok(source.includes("strongestVerifiedRelease"));
  assert.ok(source.includes("'[]'::jsonb AS findings"));
  assert.ok(!source.includes("CASE WHEN project_key='mcp/solarstorm.today' THEN findings"));
});
