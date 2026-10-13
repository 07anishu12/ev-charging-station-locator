import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { getPorts, inspectDatabase, loadEnvironment, projectRoot } from "./runtime.mjs";

const children = new Set();
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill("SIGTERM");
  const timer = setTimeout(() => {
    for (const child of children) child.kill("SIGKILL");
  }, 11000);
  timer.unref();
}

function start(args, env) {
  const child = spawn(process.execPath, args, { cwd: projectRoot, env, stdio: "inherit" });
  children.add(child);
  child.once("error", () => {
    console.error("Could not start the application. Run npm ci to install dependencies.");
    children.delete(child);
    stop(1);
  });
  child.once("exit", (code) => {
    children.delete(child);
    if (!stopping) {
      console.error("An application process exited; stopping the remaining services.");
      stop(code || 1);
    }
  });
}

async function checkPort(port) {
  await new Promise((resolvePromise, reject) => {
    const server = createServer();
    server.once("error", () => reject(new Error(`Port ${port} is occupied. Stop the existing service or set BACKEND_PORT / FRONTEND_PORT in .env.local.`)));
    server.listen(port, "0.0.0.0", () => server.close(resolvePromise));
  });
}

async function main() {
  loadEnvironment();
  const mode = process.argv[2] || "all";
  if (!["all", "backend", "frontend"].includes(mode)) throw new Error("Use npm run backend, npm run frontend, or npm run dev.");
  const ports = getPorts();
  if (mode === "all" && ports.backend === ports.frontend) throw new Error("Backend and frontend must use different ports.");
  const env = { ...process.env, API_URL: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || `http://127.0.0.1:${ports.backend}` };

  if (mode !== "frontend") {
    const count = await inspectDatabase();
    console.log(`Database ready: ${count.toLocaleString("en-IN")} station records.`);
    await checkPort(ports.backend);
  }
  if (mode !== "backend") await checkPort(ports.frontend);
  if (stopping) return;

  if (mode !== "frontend") {
    start([resolve(projectRoot, "node_modules/tsx/dist/cli.mjs"), "watch", "backend/src/server.ts"], { ...env, PORT: String(ports.backend) });
    let ready = false;
    for (let attempt = 0; attempt < 40 && !stopping; attempt++) {
      try {
        const response = await fetch(`http://127.0.0.1:${ports.backend}/health/db`, { signal: AbortSignal.timeout(1000) });
        if (response.ok) { ready = true; break; }
      } catch { /* Wait for the backend to bind its socket. */ }
      await delay(250);
    }
    if (stopping) return;
    if (!ready) throw new Error("Backend did not become ready. Check its output above.");
    console.log(`Backend: http://localhost:${ports.backend} (health: /health/db)`);
  }
  if (mode !== "backend") {
    if (mode === "frontend") console.log("Frontend-only mode: charging data requires a running backend (npm run backend) or a configured remote API_URL.");
    start([resolve(projectRoot, "node_modules/next/dist/bin/next"), "dev", "--hostname", "0.0.0.0", "--port", String(ports.frontend)], env);
    console.log(`Frontend: http://localhost:${ports.frontend}`);
  }
}

process.once("SIGINT", () => stop());
process.once("SIGTERM", () => stop());
main().catch(error => {
  console.error(`\nStartup failed: ${error.message}`);
  stop(1);
});
