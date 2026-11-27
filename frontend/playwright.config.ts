import { execFileSync } from "node:child_process";
import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

// Asks the OS for a free loopback port, the way the dev servers bind.
const FREE_PORT_SCRIPT =
  'const server = require("node:net").createServer();' +
  'server.listen(0, "127.0.0.1", () => { process.stdout.write(String(server.address().port)); server.close(); });';

/**
 * Picks the port once, in the runner process. Workers load this file again and
 * inherit the runner's environment, so they reuse the same ports. Set the
 * variable yourself to choose a port.
 */
function port(variable: string): number {
  if (!process.env[variable]) {
    process.env[variable] = execFileSync(process.execPath, ["-e", FREE_PORT_SCRIPT], { encoding: "utf8" }).trim();
  }
  return Number(process.env[variable]);
}

const backendPort = port("E2E_BACKEND_PORT");
const frontendPort = port("E2E_FRONTEND_PORT");
const backendUrl = `http://127.0.0.1:${backendPort}`;
const frontendUrl = `http://127.0.0.1:${frontendPort}`;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/test-results",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI
    ? [["list"], ["html", { outputFolder: "./e2e/playwright-report", open: "never" }]]
    : "list",
  use: {
    baseURL: frontendUrl,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Both servers are started for the run and stopped after it, never reused,
  // so a running `python scripts/dev.py dev` is left alone.
  webServer: [
    {
      name: "Backend",
      command: `uv run --no-sync uvicorn app.main:app --host 127.0.0.1 --port ${backendPort}`,
      cwd: path.resolve(__dirname, "../backend"),
      url: `${backendUrl}/algorithms`,
      env: { CORS_ORIGINS: `${frontendUrl},http://localhost:${frontendPort}` },
      reuseExistingServer: false,
      timeout: 60_000,
      gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
    },
    {
      // NEXT_PUBLIC_API_URL is inlined at build time, so the production build
      // runs here, once the backend port is known. It replaces `.next`.
      name: "Frontend",
      command: `npm run build && npm run start -- --hostname 127.0.0.1 --port ${frontendPort}`,
      cwd: __dirname,
      url: frontendUrl,
      env: { NEXT_PUBLIC_API_URL: backendUrl },
      reuseExistingServer: false,
      timeout: 300_000,
      gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
    },
  ],
});
