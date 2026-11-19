import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const API_URL = process.env.E2E_API_URL ?? "http://localhost:4000/api/v1";
/** MASTER_LOGIN_OTP in the API's local .env; it signs in to any account, and works for login only. */
export const MASTER_OTP = process.env.E2E_MASTER_OTP ?? "123456";
const API_LOG = path.join(__dirname, ".logs", "api.log");

/** A fresh address per run, so specs never trip over each other's accounts. */
export const uniqueEmail = (tag: string) => `e2e-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@local.test`;

/**
 * Clears the API's per-IP rate limits (10 code sends / 15 min) in the local WSL Redis.
 * Every spec signs in a few times from the same IP, so call it in beforeEach.
 */
export function clearRateLimits() {
  execSync(`wsl -d Ubuntu -- bash -c "redis-cli --scan --pattern 'rl:*' | xargs -r redis-cli del"`, { stdio: "ignore" });
}

/** The API's JSON envelope: `{ success, message, data }` or `{ success: false, error: { message } }`. */
export async function apiCall<T = unknown>(
  request: APIRequestContext,
  method: "GET" | "POST" | "PUT",
  route: string,
  { token, body }: { token?: string; body?: unknown } = {},
) {
  const res = await request.fetch(`${API_URL}${route}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    data: body,
  });
  const json = await res.json().catch(() => null);
  return {
    status: res.status(),
    data: json?.data as T,
    message: (json?.error?.message ?? json?.message ?? "") as string,
  };
}

/** Signs in (creating the account the first time) with the master OTP; returns the access token and user. */
export async function apiLogin(request: APIRequestContext, email: string) {
  const sent = await apiCall(request, "POST", "/auth/login/send-otp", { body: { method: "email", email } });
  expect(sent.status, `send-otp: ${sent.message}`).toBe(200);
  const res = await apiCall<{ accessToken: string; user: { id: string; email: string; current_privacy_policy_version: string } }>(
    request, "POST", "/auth/login/verify-otp", { body: { method: "email", email, otp: MASTER_OTP } },
  );
  expect(res.status, `verify-otp: ${res.message}`).toBe(200);
  return { token: res.data.accessToken, user: res.data.user };
}

/** A new account past the first-run gates (onboarding skipped, policy accepted), so the app opens normally. */
export async function readyUser(request: APIRequestContext, email: string) {
  const { token, user } = await apiLogin(request, email);
  expect((await apiCall(request, "POST", "/user/profile/onboarding/skip", { token })).status).toBe(200);
  const accepted = await apiCall(request, "POST", "/user/profile/privacy-policy/accept", {
    token,
    body: { version: user.current_privacy_policy_version },
  });
  expect(accepted.status, accepted.message).toBe(200);
  return { token, user };
}

/** Signs in through the login page with an emailed code (the master OTP); ends on the app's home. */
export async function uiLogin(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send code" }).click();
  // Six separate boxes; the last digit submits on its own.
  const first = page.getByLabel("Digit 1");
  await expect(first).toBeVisible();
  for (const [i, d] of [...MASTER_OTP].entries()) {
    await page.getByLabel(`Digit ${i + 1}`).fill(d);
  }
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });
}

/** Where the API log ends now; pass it to waitForCode so older codes are ignored. */
export function logMark() {
  return fs.existsSync(API_LOG) ? fs.statSync(API_LOG).size : 0;
}

/**
 * The newest code the dev API logged for `purpose` after `mark`. Needs the API started by
 * e2e/up.mjs (it writes e2e/.logs/api.log). Pino prints the fields on the lines after the message.
 */
export async function waitForCode(purpose: string, mark: number, timeoutMs = 10_000): Promise<string> {
  if (!fs.existsSync(API_LOG)) {
    throw new Error("e2e/.logs/api.log is missing: stop the running API and start it with `node e2e/up.mjs`");
  }
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const fd = fs.openSync(API_LOG, "r");
    const size = fs.fstatSync(fd).size;
    const buf = Buffer.alloc(Math.max(0, size - mark));
    fs.readSync(fd, buf, 0, buf.length, mark);
    fs.closeSync(fd);
    const text = buf.toString("utf8").replace(/\x1b\[[0-9;]*m/g, "");
    const codes = [...text.matchAll(/OTP issued[^\n]*\n\s*purpose: "([a-z_]+)"\n\s*method: "[a-z]+"\n\s*otp: "(\d{6})"/g)]
      .filter((m) => m[1] === purpose)
      .map((m) => m[2]);
    if (codes.length) return codes[codes.length - 1];
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`no "${purpose}" code in e2e/.logs/api.log within ${timeoutMs}ms`);
}

/** A code that isn't `code` (for wrong-code checks). */
export const otherCode = (code: string) => (code === "111111" ? "222222" : "111111");
