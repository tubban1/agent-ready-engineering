/** Exact-byte Ed25519 release verification. No private key belongs in source,
 * Neon, a connected Agent account, or any repo secret. Public keys only.
 */
import { createPublicKey, verify } from "node:crypto";

const HEX64 = /^[a-f0-9]{64}$/;
const KEY_ID = /^[a-z0-9._-]{2,64}$/;

export function verifySignedRelease(record, keyring, targetProjectKey) {
  if (!record || typeof record !== "object" || !keyring || typeof keyring !== "object") return null;
  const { key_id, payload_text, signature_b64 } = record;
  if (typeof key_id !== "string" || !KEY_ID.test(key_id)) return null;
  if (typeof payload_text !== "string" || Buffer.byteLength(payload_text, "utf8") > 128_000) return null;
  if (typeof signature_b64 !== "string" || !/^[A-Za-z0-9+/]{86}==$/.test(signature_b64)) return null;
  if (typeof keyring[key_id] !== "string" || !keyring[key_id].includes("BEGIN PUBLIC KEY")) return null;
  const signature = Buffer.from(signature_b64, "base64");
  if (signature.length !== 64) return null;
  try {
    const ok = verify(null, Buffer.from(payload_text, "utf8"), createPublicKey(keyring[key_id]), signature);
    if (!ok) return null;
    const p = JSON.parse(payload_text);
    if (!p || p.schema !== "are.owner-signed-public-release.v1" ||
        p.project_key !== targetProjectKey || !Number.isSafeInteger(p.revision) || p.revision < 1 ||
        !["PUBLISH", "REVOKE"].includes(p.decision) ||
        typeof p.approved_at !== "string" || !/^\d{4}-\d\d-\d\dT/.test(p.approved_at) ||
        typeof p.owner_reviewer !== "string" || p.owner_reviewer.length < 2 ||
        typeof p.reason !== "string" || p.reason.length < 8) return null;
    if (p.decision === "REVOKE") return { decision: "REVOKE", revision: p.revision, project_key: p.project_key };
    if (!HEX64.test(p.case_sha256) || typeof p.source_revision !== "string" ||
        !p.source_revision || typeof p.case_url !== "string") return null;
    const url = new URL(p.case_url);
    if (url.protocol !== "https:" || url.hostname !== "are.world2.co" ||
        !url.pathname.startsWith("/evidence/")) return null;
    if (typeof p.summary !== "string" || p.summary.length > 6000 ||
        !Array.isArray(p.strengths) || !Array.isArray(p.findings) ||
        !Array.isArray(p.evidence) ||
        !p.strengths.every(x => typeof x === "string" && x.length < 2000) ||
        !p.findings.every(x => typeof x === "string" && x.length < 2000) ||
        p.strengths.length > 24 || p.findings.length > 24 || p.evidence.length > 32) return null;
    return {
      decision: "PUBLISH", project_key: p.project_key, revision: p.revision,
      source_revision: p.source_revision, case_sha256: p.case_sha256,
      case_url: p.case_url, approved_at: p.approved_at,
      summary: p.summary, strengths: p.strengths, findings: p.findings,
      evidence: p.evidence.filter(e => typeof e?.url === "string" && /^https:\/\//.test(e.url)),
    };
  } catch {
    return null;
  }
}

/** Evaluate all rows, not just the latest untrusted DB entry. A forged revision
 * cannot suppress a valid older approval or fabricate a new approval.
 */
export function strongestVerifiedRelease(records, keyring, key) {
  let last = null;
  for (const record of records || []) {
    const checked = verifySignedRelease(record, keyring, key);
    if (checked && (!last || checked.revision > last.revision)) last = checked;
  }
  return last;
}

export function releaseProjection(directory, signed) {
  const minimal = { ...directory,
    source_ref: null, publication: "directory_only", narrative_lang: "none",
    summary: "", strengths: [], findings: [], dimensions: {}, evidence: [],
    assessment_level: null,
  };
  if (!signed || signed.decision !== "PUBLISH") return minimal;
  return { ...minimal,
    source_ref: signed.case_url, publication: "published_case", narrative_lang: "en",
    summary: signed.summary, strengths: signed.strengths, findings: signed.findings,
    evidence: signed.evidence, public_release_revision: signed.revision,
    public_release_hash: signed.case_sha256,
  };
}
