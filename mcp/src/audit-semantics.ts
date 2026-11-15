/**
 * Evidence-to-check *review flags* for local ARE assessments.
 * A citation existing on disk proves neither runtime success nor adequacy.
 * Rules only raise review requests, never VERIFIED_FAIL or certified levels.
 */
export type SemanticFlag = {
  code: string; severity: "blocker" | "review"; check?: string; message: string; hint: string;
};
export type SemanticRow = { id: string; state: string; evidence: string };

function flag(code: string, severity: "blocker"|"review", message: string, hint: string, check?: string): SemanticFlag {
  return {code,severity,...(check?{check}:{}),message,hint};
}
function denied(line: string): boolean {
  return /(?:不要|不应|不该|不得|禁止|避免|反对|拒绝|否决|误报|错误|不可|不能|不再|并未|未建议|已证伪|已纠正|不(?:需要|能|会)|would not|should not|do not|don't|never|rejected|incorrect|false positive|not recommended|without removing)/i.test(line);
}
function recommendationLines(report:string):string[]{
  return report.split(/\r?\n/).filter(line => !/^\s*(?:\||>|`{3}|[-=]{3,})/.test(line) && !denied(line));
}
const SUFFICIENCY: Record<string,{requirement:string;groups:Array<[string,RegExp]>}> = {
  "L2-C1":{requirement:"All read-only schemas: types, applicable units/enums, source and update time.",groups:[
    ["types",/(?:\bzod\b|(?:input|output)\s*schema|强类型|类型约束|\btype\s*:)/i],
    ["units/enums",/(?:\benum\b|单位|\bunits?\b|枚举)/i],
    ["source",/(?:\bsource\b|来源)/i],
    ["update time",/(?:updatedAt|lastUpdated|更新时间|更新日期|\btimestamp\b)/i]
  ]},
  "L2-A1":{requirement:"Separate agent/human identities, narrowly scoped, short-lived and revocable delegated credentials (or justified N/A).",groups:[
    ["identity separation",/(?:agent.?identity|agent.*(?:人类|用户|human)|身份分离|独立身份|separat.{0,15}human)/i],
    ["delegated scope",/(?:delegat|委托|授权范围|权限范围|\bscope\b)/i],
    ["expiry",/(?:expir|有效期|短期|短时|short.lived|\bttl\b)/i],
    ["revocation",/(?:revok|撤销|吊销)/i]
  ]},
  "L2-A2":{requirement:"External content has provenance and explicit trust-level classification.",groups:[
    ["external content",/(?:external|third.party|外部内容|第三方|用户文件|untrusted)/i],
    ["provenance",/(?:source|provenance|来源)/i],
    ["trust level",/(?:trust|可信|不可信|信任等级)/i]
  ]},
  "L3-A4":{requirement:"Amount AND frequency limits AND an agent disable/kill switch, not timeout alone.",groups:[
    ["amount limit",/(?:金额|数量限额|额度|金额限制|\bamount\b|monetary|spend.?limit|transaction.?limit)/i],
    ["frequency limit",/(?:频率|每(?:秒|分钟|小时|日)|速率|请求限流|\brate.?limit\b|frequency|per.?minute|requests.?per)/i],
    ["kill switch",/(?:熔断|停用|禁用|关闭开关|kill.?switch|disable|circuit.?breaker)/i]
  ]},
  "L3-O1":{requirement:"Audit record includes claim ID or pre-authorization ID, not merely actor/submission/changeRef.",groups:[
    ["authorization receipt identifier",/(?:claim.?id|pre.?auth(?:orization)?(?:.?id)?|approval.?receipt|授权凭证(?:ID|编号)?|预授权(?:ID|编号)?|认领凭证)/i]
  ]},
  "L4-O1":{requirement:"The same correlation ID spans agent session, tool call, core transaction and external effect.",groups:[
    ["agent session",/(?:agent.?session|会话)/i],
    ["tool call",/(?:tool.?call|工具调用|callId)/i],
    ["core transaction",/(?:core.?transaction|核心事务|\btransaction\b)/i],
    ["external effect",/(?:external.?effect|外部效果|副作用|effect.?id|外部系统)/i]
  ]},
  "L4-R1":{requirement:"Test/production isolation, write rollout, rollback AND named owner.",groups:[
    ["environment separation",/(?:环境隔离|测试环境|staging|sandbox|production|prod.?isolat)/i],
    ["rollout",/(?:灰度|发布计划|rollout|canary)/i],
    ["rollback",/(?:回滚|rollback)/i],
    ["owner",/(?:负责人|Owner|责任人|审批人)/i]
  ]}
};

/**
 * The value card/capability matrix are *information requirements*, not fixed
 * file naming rules. For a solo OSS maintainer a concise, owner-reviewed
 * section in README/AGENTS or a project document can be an equivalent.
 * A few keywords never prove human approval; emit a manual review flag.
 */
export function lightweightEquivalent(row:SemanticRow, citedExcerpt:string):boolean {
  if(row.state!=="VERIFIED_PASS")return false;
  if(!/(?:README|AGENTS|docs\/|\.mdc(?:#|$))/i.test(row.evidence))return false;
  const text=row.evidence+"\n"+citedExcerpt;
  const has=(re:RegExp)=>re.test(text);
  switch(row.id){
    case "L1-V1":
      return has(/(?:决策|decision).{0,30}(?:\bGo\b|只读先行|read.only first)/i)
        && !has(/(?:no.go|不启动|拒绝启动)/i)
        && has(/(?:owner|责任人|项目负责人|维护者)/i)
        && has(/(?:beneficiar|用户|受益人|user.task|场景)/i);
    case "L1-V2":
      return has(/(?:baseline|基线)/i) && has(/(?:metric|指标)/i)
        && has(/(?:来源|实测|source|not.measured|未测)/i)
        && has(/(?:计划|复测|测量方案|measurement plan|measure)/i);
    case "L1-V3":
      return has(/(?:最小验证|minimum.validation|real.task|真实任务)/i)
        && has(/(?:通过|失败|结果|测量|pass|fail|result)/i)
        && has(/(?:20\d\d|日期|time|date)/i);
    case "L1-V4":
      return has(/(?:首批|first.batch)/i)
        && has(/(?:上限|不超过|封顶|cap|maximum|limit)/i)
        && has(/(?:操作|工具|operations?|tools?)/i);
    case "L1-A1":
      return has(/(?:首批|first.batch)/i)
        && has(/(?:owner|所有者)/i)
        && has(/(?:approver|审批人|授权人)/i)
        && has(/(?:responsible|负责人|执行者)/i);
    case "L1-C1":
      return has(/(?:万能执行器|catch.all|generic.executor|万能工具)/i)
        && has(/(?:拆分|无需拆分|不存在|split|none|not.applicable)/i);
    default:return false;
  }
}
const COVERAGE:Record<string,{scope:string;required:RegExp[]}>={
 "L2-X4":{scope:"every applicable read-only tool and its measured response size",required:[
   /(?:measured|实测|测量)/i,/(?:bytes?|字节|payload.size|响应体积)/i
 ]},
 "L2-O2":{scope:"independently verified outcomes of real autonomous Agent tasks",required:[
   /(?:agent.host|agent自主|自主.agent|agent.session|模型选择|自主选.*工具)/i,
   /(?:independent.oracle|independent.outcome|独立验证|成功判据|用户任务)/i
 ]},
 "L3-C1":{scope:"all write tools, idempotency scope, retention and replay result",required:[
   /(?:idempoten|幂等)/i,/(?:重放|replay)/i,/(?:原始结果|original.result)/i,
   /(?:retention|保留期|过期)/i
 ]},
 "L3-C2":{scope:"all mutable resources and expected_revision conflict semantics",required:[
   /(?:expected_revision|预期版本)/i,/(?:冲突|conflict)/i,
   /(?:latest.revision|最新版本)/i,/(?:difference|差异|\bdiff\b)/i
 ]},
 "L3-C4":{scope:"first-batch write operations with operation contracts and accepted tests",required:[
   /(?:首批|first.batch)/i,/(?:operation.contract|操作契约)/i,
   /(?:验收|acceptance)/i
 ]},
 "L3-O2":{scope:"full fault-injection matrix with positive test records",required:[
   /(?:重试|retry)/i,/(?:版本冲突|revision.conflict)/i,
   /(?:断连|disconnect)/i,/(?:prompt.injection|提示注入)/i,
   /(?:missing.input|缺失信息)/i,/(?:fault.injection|故障注入)/i
 ]}
};
export function coverageReview(row:SemanticRow,citedExcerpt:string):SemanticFlag[]{
 if(row.state!=="VERIFIED_PASS")return [];
 const rule=COVERAGE[row.id];if(!rule)return [];
 const text=row.evidence+"\n"+citedExcerpt;
 const ratios=[...text.matchAll(/(\d{1,5})\s*\/\s*(\d{1,5})/g)]
   .map(m=>[Number(m[1]),Number(m[2])] as const)
   .filter(([a,b])=>a>0&&a===b);
 const missing=rule.required.filter(re=>!re.test(text)).length;
 if(!ratios.length||missing){
   return [flag("coverage_not_proven","blocker",
     row.id+": evidence lacks a full-scope denominator and/or "+missing+" required verification dimensions.",
     "Provide matched actual/completed counts (e.g. measured 7/7 in-scope read tools) AND records for "+rule.scope+". A scripted SDK probe is not autonomous Agent evaluation.",row.id)];
 }
 return [flag("scope_denominator_needs_review","review",
   row.id+": full coverage claimed by an evidence ratio; independent denominator verification still required.",
   "Confirm the denominator equals all applicable operations/tasks at the pinned commit and the independent results actually passed.",row.id)];
}
export function authorizationReview(row:SemanticRow,citedExcerpt:string):SemanticFlag[]{
 if(row.state!=="VERIFIED_PASS"||row.id!=="L3-A2")return [];
 const text=row.evidence+"\n"+citedExcerpt;
 const needs=[
  /(?:server.side|服务端|后端|server)/i,
  /(?:拒绝|reject|forbid|deny)/i,
  /(?:agent.self|agent.*(?:确认|自报)|自认|self.confirm)/i,
  /(?:claim|预授权|pre.?auth)/i,
  /(?:测试|test|assert|断言)/i
 ];
 if(needs.some(re=>!re.test(text))){
   return [flag("authorization_semantics_unverified","blocker",
     "L3-A2 PASS has no cited server-side test rejecting agent self-confirmation.",
     "Cite execution logs/test assertions proving invalid agent-confirmed claims are rejected by the server.",row.id)];
 }
 return [flag("authorization_rejection_needs_review","review",
   "L3-A2 cites a server-side rejection test; a reviewer must confirm it exercised the real authorization boundary.",
   "Verify request identity, preauthorization/claim validation and a real rejection response.",row.id)];
}
export function semanticReview(row:SemanticRow,citedExcerpt:string):SemanticFlag[]{
  if(row.state!=="VERIFIED_PASS")return [];
  const rule=SUFFICIENCY[row.id];
  if(!rule)return [];
  const evidence=row.evidence+"\n"+citedExcerpt;
  const missing=rule.groups.filter(([,pattern])=>!pattern.test(evidence)).map(([name])=>name);
  return missing.length?[flag("semantic_elements_missing","blocker",
    row.id+": cited evidence does not address "+missing.join(", ")+".",
    rule.requirement+" Supply source-linked evidence for each missing element, or use UNKNOWN/FAIL/N/A as appropriate. Keyword matching is NOT semantic certification.",row.id)]:[];
}
export function applicabilityReview(row:SemanticRow,report:string):SemanticFlag[]{
  if(row.state!=="NOT_APPLICABLE")return [];
  if(row.id==="L3-S1"){
    const task=/(?:(?:vibe_)?session_start|\brunInterruptibleScan\b|长任务|长时间任务|(?:running|active|in.flight).{0,30}(?:scan|task)|运行中.{0,20}扫描)/i.test(report);
    const control=/(?:\bWorker\b|(?:cancel|abort|timeout|recover|resume).{0,25}(?:scan|task)|(?:scan|task).{0,25}(?:cancel|abort|timeout|recover)|取消|超时)/i.test(report);
    if(task&&control&&/(?:无.{0,10}(?:守护进程|daemon)|no.{0,15}(?:daemon|background)|not.{0,18}long.running)/i.test(row.evidence)){
      return [flag("na_long_task_contradiction","blocker",
        "L3-S1 is N/A because no daemon exists, but the report describes in-flight tasks that can cancel/timeout.",
        "Check status, cancellation and recovery by ID after disconnect. No daemon does not imply no long-running tasks.",row.id)];
    }
  }
  if(row.id==="L4-I2"&&/(?:streamable.?http|http.?mcp)/i.test(report)&&/\bstdio\b/i.test(report)
      &&/(?:single.{0,15}ingress|仅.{0,12}(?:一个|单一).{0,12}(?:入口|接入|协议))/.test(row.evidence)){
    return [flag("na_multiple_ingress_conflict","review",
      "L4-I2 N/A claims single ingress, yet report mentions HTTP and stdio.",
      "Confirm whether these are ingress paths of the same target (not an unrelated ARE server).",row.id)];
  }
  return [];
}

export function riskyRecommendations(report:string):SemanticFlag[]{
  const flags:SemanticFlag[]=[];
  const lines=recommendationLines(report);
  if(lines.some(line=>
    /(?:建议.{0,12}(?:删除|移除|淘汰|废弃)|(?:直接|彻底)(?:删除|移除)|(?:应当|应该|必须)(?:删除|移除|淘汰)|\b(?:remove|retire|delete)\s+(?:the\s+)?(?:tool|operation)\b)/i.test(line)
  ))flags.push(flag("unsafe_tool_retirement","blocker",
    "Report recommends retirement without proven task-level equivalence.",
    "Verify in-flight cancellation, permissions, downstream integrations and all task outcomes before removing tools."));
  if(lines.some(line=>
    /(?:所有|全部|every|all)\s*.{0,30}(?:工具|tools?).{0,60}\breadOnlyHint\s*:\s*true/i.test(line)
  ))flags.push(flag("bulk_readonly_annotation","blocker",
    "Report recommends blanket readOnlyHint:true with no per-tool side effect evidence.",
    "Check local writes, telemetry, policy refresh and network effects."));
  const tokens=lines.some(line=>
    /(?:节省|减少|降低|优化|save[ds]?|reduc(?:e|ed)|lower(?:ed)?).{0,40}(?:token|令牌)/i.test(line)
    &&/(?:\b\d[\d,.]*\s*[kK]?\s*token|[\d,.]+\s*万\s*token)/i.test(line)
    &&!/(?:估算|预计|未测|推断|尚未测|estimate|hypothesis|not measured)/i.test(line));
  if(tokens)flags.push(flag("unverified_token_benefit","review",
    "Report asserts numeric token savings; MCP bytes are not measured Host token usage.",
    "Use Host usage records or label token savings a hypothesis."));
  return flags;
}
