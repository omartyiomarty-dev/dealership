// Load test: measures throughput, latency percentiles and error rate.
// Usage: BASE=http://localhost:3000 CONC=100 DUR=20 node tests/load.mjs
const B = process.env.BASE || "http://localhost:3000";
const CONC = Number(process.env.CONC || 100);          // concurrent workers
const DUR = Number(process.env.DUR || 20) * 1000;      // duration ms
const PATHS = [
  "/",
  "/vehicles",
  "/choose",
  "/api/vehicles/search?cat=1,2&transmission=automatic",
  "/api/vehicles/search?tx=rent&sort=price_asc",
  "/vehicles/v100",
  "/vehicles",
];
const lat = [];
let errors = 0, total = 0, statusCount = {};
let stop = false;
const agent = new (await import("node:http")).Agent({ keepAlive: true, maxSockets: CONC });

const startedAt = Date.now();
setTimeout(() => { stop = true; }, DUR);

async function worker(id) {
  let i = id % PATHS.length;
  while (!stop) {
    const path = PATHS[i % PATHS.length]; i++;
    const t = performance.now();
    try {
      const r = await fetch(B + path, { headers: { cookie: "lang=ar" }, keepalive: false });
      await r.arrayBuffer();
      const ms = performance.now() - t;
      total++; lat.push(ms);
      statusCount[r.status] = (statusCount[r.status] || 0) + 1;
      if (r.status >= 500) errors++;
    } catch { total++; errors++; statusCount["net"] = (statusCount["net"] || 0) + 1; }
  }
}
const start = performance.now();
await Promise.all(Array.from({ length: CONC }, (_, i) => worker(i)));
const secs = (performance.now() - start) / 1000;
lat.sort((a, b) => a - b);
const pct = (p) => lat[Math.min(lat.length - 1, Math.floor((p / 100) * lat.length))].toFixed(0);
console.log(`requests=${total}  rps=${(total / secs).toFixed(1)}  errors(5xx/net)=${errors}`);
console.log(`p50=${pct(50)}ms  p90=${pct(90)}ms  p95=${pct(95)}ms  p99=${pct(99)}ms  max=${lat[lat.length - 1].toFixed(0)}ms`);
console.log("status codes:", JSON.stringify(statusCount));
process.exit(errors === 0 ? 0 : 1);
