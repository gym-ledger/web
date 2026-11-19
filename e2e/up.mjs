// Gets the local stack ready for the e2e specs; safe to run again.
//   node e2e/up.mjs
// - runs pending API migrations (workout-gym-api, next to this repo)
// - starts the API (:4000) and this app (`next dev` on E2E_WEB_PORT, default 3002) only if they
//   don't answer yet, and waits for them. It never stops anything.
// The API's output goes to e2e/.logs/api.log: in development the API logs every code it
// issues there, which is how specs read codes that the master OTP doesn't cover.
import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(here, "..");
const apiDir = path.resolve(webDir, process.env.E2E_API_DIR ?? "../workout-gym-api");
const logDir = path.join(here, ".logs");
const API_URL = process.env.E2E_API_URL ?? "http://localhost:4000/api/v1";
const WEB_PORT = process.env.E2E_WEB_PORT ?? "3002";
const WEB_URL = `http://localhost:${WEB_PORT}`;

const answers = async (url) => {
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
        return res.status < 500;
    } catch {
        return false;
    }
};

const waitFor = async (name, url, timeoutMs) => {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
        if (await answers(url)) return;
        await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error(`${name} did not answer on ${url} within ${timeoutMs / 1000}s (see ${logDir})`);
};

const start = (name, cwd, command, logFile) => {
    fs.mkdirSync(logDir, { recursive: true });
    const out = fs.openSync(path.join(logDir, logFile), "w");
    // On Windows a detached child gets its own console and its output skips the log file;
    // there it outlives this script without detaching anyway.
    const detached = process.platform !== "win32";
    const child = spawn(command, { cwd, shell: true, detached, windowsHide: true, stdio: ["ignore", out, out] });
    child.unref();
    console.log(`${name}: started (pid ${child.pid}, log e2e/.logs/${logFile})`);
};

execSync("npm run migrate", { cwd: apiDir, stdio: "ignore" });
console.log("migrations: up to date");

if (await answers(`${API_URL}/auth/config`)) {
    console.log(`api: already running on ${API_URL} (codes other than the master OTP need it started by this script)`);
} else {
    start("api", apiDir, "npm run dev", "api.log");
    await waitFor("api", `${API_URL}/auth/config`, 60_000);
}

if (await answers(WEB_URL)) {
    console.log(`web: already running on ${WEB_URL}`);
} else {
    start("web", webDir, `npx next dev -p ${WEB_PORT}`, "web.log");
    await waitFor("web", `${WEB_URL}/login`, 120_000);
}
console.log("ready");
