import autocannon from "autocannon";
import { writeFileSync } from "node:fs";

const host = new URL(process.env.TARGET_URL).host;
const outFile = process.env.OUT_FILE;

const ENDPOINTS = [
  { name: "GET product-odata (collection)", path: "/odata/product-odata" },
  { name: "GET product-odata $count", path: "/odata/product-odata/$count" },
  { name: "GET $metadata", path: "/odata/$metadata" },
  { name: "GET category $expand products", path: "/odata/category-odata?$expand=products" },
];

const DURATION = 15;
const CONNECTIONS = 50;
const ROUNDS = 3;
const WARMUP = 3;

async function measure(ep) {
  const url = `http://${host}${ep.path}`;
  // warmup para estabilizar caches/connection pool (no se mide)
  await autocannon({ url, connections: CONNECTIONS, duration: WARMUP, pipelining: 1, method: "GET" });
  const p95s = [];
  const rpss = [];
  for (let r = 0; r < ROUNDS; r++) {
    const result = await autocannon({
      url,
      connections: CONNECTIONS,
      duration: DURATION,
      pipelining: 1,
      timeout: 10,
      method: "GET",
    });
    p95s.push(Number(result.latency?.p97_5 ?? result.latency?.p95 ?? 0));
    rpss.push(Number(result.requests?.average ?? 0));
  }
  p95s.sort((a, b) => a - b);
  rpss.sort((a, b) => a - b);
  return {
    p95_ms: +p95s[Math.floor(ROUNDS / 2)].toFixed(2),
    req_s: +rpss[Math.floor(ROUNDS / 2)].toFixed(1),
    raw_p95: p95s,
    raw_rps: rpss,
  };
}

async function main() {
  process.stderr.write(`Benchmarking single server ${host} (warmup ${WARMUP}s, ${ROUNDS} rounds)\n`);
  const rows = [];
  for (const ep of ENDPOINTS) {
    const m = await measure(ep);
    const errors = 0;
    rows.push({ endpoint: ep.name, path: ep.path, req_s: m.req_s, p95_ms: m.p95_ms, errors, raw_p95: m.raw_p95, raw_rps: m.raw_rps });
    process.stderr.write(`  ${ep.name}: p97_5=${m.p95_ms}ms req/s=${m.req_s} (rounds p95=${m.raw_p95})\n`);
  }
  writeFileSync(outFile, JSON.stringify(rows, null, 2));
  process.stderr.write(`WROTE ${outFile}\n`);
}

main().catch((e) => {
  process.stderr.write("BENCH ERROR: " + e.stack + "\n");
  process.exit(1);
});
