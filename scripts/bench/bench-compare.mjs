import { readFileSync, writeFileSync } from "node:fs";

const feature = JSON.parse(readFileSync(process.env.FEATURE_FILE, "utf-8"));
const baseline = JSON.parse(readFileSync(process.env.BASELINE_FILE, "utf-8"));
const GATE = 10;

const rows = feature.map((f, i) => {
  const b = baseline[i];
  const p95Rel = b.p95_ms > 0 ? (f.p95_ms - b.p95_ms) / b.p95_ms : 0;
  const reqRel = b.req_s > 0 ? (f.req_s - b.req_s) / b.req_s : 0;
  let assessment = "PASS";
  if (f.errors > 0 || b.errors > 0) assessment = "FAIL (errores)";
  else if (p95Rel * 100 > GATE) assessment = `WARN (> ${GATE}% p95)`;
  else if (reqRel * 100 < -GATE) assessment = `WARN (> ${GATE}% req/s)`;
  return {
    endpoint: f.endpoint,
    path: f.path,
    baseline_p95_ms: b.p95_ms,
    feature_p95_ms: f.p95_ms,
    p95_degradation_pct: +(p95Rel * 100).toFixed(2),
    baseline_req_s: b.req_s,
    feature_req_s: f.req_s,
    req_s_change_pct: +(reqRel * 100).toFixed(2),
    feature_errors: f.errors,
    baseline_errors: b.errors,
    assessment,
  };
});

const warnings = rows.filter((r) => r.assessment.startsWith("WARN")).length;
const fails = rows.filter((r) => r.assessment.startsWith("FAIL")).length;
const verdict = fails > 0 ? "FAIL" : warnings > 0 ? "WARN" : "PASS";

const summary = { gate_pct: GATE, rows, verdict, warnings, fails };
writeFileSync("C:\\Users\\Horan\\AppData\\Local\\Temp\\opencode\\benchmark-gate.json", JSON.stringify(summary, null, 2));
console.log(`VERDICT: ${verdict} (warnings=${warnings}, fails=${fails})`);
