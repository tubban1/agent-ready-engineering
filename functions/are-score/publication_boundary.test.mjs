import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const code=readFileSync(new URL("./index.mjs", import.meta.url),"utf8");
test("creator self-publication is explicitly limited to verified domain ownership",()=>{
  assert.match(code,/t\.is_public AND t\.owner_proof_status='domain_verified' AND EXISTS\(SELECT 1 FROM are_eval\.benchmark_claims/);
  assert.match(code,/id=\$1::uuid AND is_public=true AND owner_proof_status='domain_verified' AND EXISTS\(SELECT 1 FROM are_eval\.benchmark_claims/);
  assert.match(code,/WHERE id=\$1::uuid AND owner_proof_status='domain_verified' RETURNING id,is_public/);
});
test("the public creator endpoint does not claim official ARE maturity",()=>{
  assert.match(code,/maturity_level:null,maturity_checks_verified:0/);
  assert.match(code,/owner_proof_required/);
});
