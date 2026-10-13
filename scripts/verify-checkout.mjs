import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { getPorts, loadEnvironment, projectRoot, runCommand } from "./runtime.mjs";

loadEnvironment();
const ports = getPorts();
const manifest = JSON.parse(await readFile(resolve(projectRoot, "data/snapshot/manifest.json"), "utf8"));
const child = spawn(process.execPath, [resolve(projectRoot, "scripts/dev.mjs"), "all"], { cwd: projectRoot, stdio: "inherit" });
let exited = false;
child.once("exit", () => { exited = true; });
try {
  let ready = false;
  for (let attempt = 0; attempt < 90 && !exited; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${ports.frontend}/api/v1/statistics`, { signal: AbortSignal.timeout(2000) });
      if (response.ok) {
        const { data } = await response.json();
        if (data.totalStations !== manifest.discoveryCounts.stations || data.totalCities !== manifest.discoveryCounts.cities || data.totalOperators !== manifest.discoveryCounts.operators) {
          throw new Error("API discovery counts do not match the bundled snapshot.");
        }
        ready = true;
        break;
      }
    } catch (error) {
      if (error.message.includes("do not match")) throw error;
    }
    await delay(1000);
  }
  if (!ready) throw new Error("The combined command did not start a healthy frontend/API.");
  const health = await fetch(`http://127.0.0.1:${ports.backend}/health/db`);
  if (!health.ok) throw new Error("Backend database health failed.");
  const list = await fetch(`http://127.0.0.1:${ports.frontend}/api/v1/stations?pageSize=2`);
  const { data: stations } = await list.json();
  if (!list.ok || stations.items.length !== 2 || stations.pagination.total !== manifest.counts.stations) throw new Error("Station API failed.");
  const html = await fetch(`http://127.0.0.1:${ports.frontend}/`).then(r => r.text());
  if (!html.includes("Recently Updated") || html.includes("Charging data unavailable")) throw new Error("Homepage did not render station data.");
  console.log(`Fresh-checkout smoke test passed: ${manifest.counts.stations} stations, backend health, frontend proxy and homepage.`);
  if (process.argv.includes("--test")) {
    // Live database/API consistency tests need the services to remain running.
    await runCommand(process.execPath, [resolve(projectRoot, "node_modules/vitest/vitest.mjs"), "run"]);
  }
} catch (error) {
  console.error(`Fresh-checkout smoke test failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  child.kill("SIGTERM");
}
