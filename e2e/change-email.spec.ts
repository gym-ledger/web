import { expect, test } from "@playwright/test";
import {
  apiCall,
  apiLogin,
  clearRateLimits,
  logMark,
  otherCode,
  readyUser,
  uiLogin,
  uniqueEmail,
  waitForCode,
} from "./helpers";

// Settings → Security → Email: confirm it's you → code to the new address → changed.
// API side: workout-gym-api src/modules/users/users.account (email change section).

const SHOTS = process.env.E2E_SHOTS_DIR;

test.beforeEach(() => clearRateLimits());

test.describe("change email API", () => {
  test("refuses bad input, needs both codes, and only changes on the right one", async ({ request }) => {
    const a = uniqueEmail("a");
    const b = uniqueEmail("b");
    const target = uniqueEmail("new");
    const { token } = await apiLogin(request, a);
    const { token: tokenB } = await apiLogin(request, b);

    const account = await apiCall<{ email_change: { confirm_with: string } }>(request, "GET", "/user/account", { token });
    expect(account.data.email_change.confirm_with).toBe("email_code");

    const send = (body: object, t = token) => apiCall<{ change_token: string }>(request, "POST", "/user/account/email/send-code", { token: t, body });

    expect((await send({ email: target })).message).toBe("Enter the code we sent you");
    expect((await send({ email: a.toUpperCase(), code: "000000" })).message).toBe("That's already your email");
    const taken = await send({ email: b, code: "000000" });
    expect(taken.status).toBe(409);
    expect(taken.message).toContain("already in use");
    expect((await send({ email: "not-an-email", code: "000000" })).status).toBe(400);

    let mark = logMark();
    expect((await apiCall(request, "POST", "/user/account/email/confirm-code", { token })).status).toBe(200);
    const confirmCode = await waitForCode("email_change_auth", mark);
    expect((await send({ email: target, code: otherCode(confirmCode) })).status).toBe(400);

    mark = logMark();
    const sent = await send({ email: target, code: confirmCode });
    expect(sent.status, sent.message).toBe(200);
    const changeToken = sent.data.change_token;
    const newCode = await waitForCode("email_change", mark);

    // The token is tied to its user.
    expect((await apiCall(request, "POST", "/user/account/email/verify", {
      token: tokenB, body: { email: target, code: newCode, change_token: changeToken },
    })).status).toBe(400);
    // A forged token falls back to asking for the confirmation again.
    expect((await send({ email: target, change_token: `${Date.now() + 600_000}.forged` })).status).toBe(400);

    const verify = (code: string) => apiCall<{ user: { email: string } }>(request, "POST", "/user/account/email/verify", {
      token, body: { email: target, code, change_token: changeToken },
    });
    expect((await verify(otherCode(newCode))).status).toBe(400);
    const profile = await apiCall<{ email: string }>(request, "GET", "/user/profile", { token });
    expect(JSON.stringify(profile.data)).toContain(a);

    const done = await verify(newCode);
    expect(done.status, done.message).toBe(200);
    expect(done.data.user.email).toBe(target);
    expect((await verify(newCode)).status).toBe(400);

    clearRateLimits();
    const relogin = await apiLogin(request, target);
    expect(relogin.user.email).toBe(target);
  });
});

test.describe("change email in Settings", () => {
  test("account without a password confirms with a code to the current email", async ({ page, request }) => {
    const email = uniqueEmail("ui");
    const target = uniqueEmail("ui-new");
    await readyUser(request, email);
    await uiLogin(page, email);

    await page.goto("/profile/settings");
    await expect(page.getByText(email)).toBeVisible();
    await page.getByRole("button", { name: "Change email" }).click();
    await expect(page.getByRole("heading", { name: "Change your email" })).toBeVisible();

    await page.getByLabel("New email").fill(target);
    let mark = logMark();
    await page.getByRole("button", { name: "Send me a code" }).click();
    await page.getByLabel("Confirmation code").fill(await waitForCode("email_change_auth", mark));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/email-1-confirm.png` });

    mark = logMark();
    await page.getByRole("button", { name: "Send code to new email" }).click();
    await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
    await expect(page.getByText(target)).toBeVisible();
    const code = await waitForCode("email_change", mark);

    // A wrong code changes nothing.
    await page.getByLabel("Code from the new email").fill(otherCode(code));
    await page.getByRole("button", { name: "Confirm new email" }).click();
    await expect(page.getByText("Invalid OTP. Please try again")).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/email-2-wrong-code.png` });

    await page.getByLabel("Code from the new email").fill(code);
    await page.getByRole("button", { name: "Confirm new email" }).click();
    await expect(page.getByText("Email changed")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeHidden();
    await expect(page.getByText(target)).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/email-3-changed.png` });
  });

  test("account with a password confirms with it, and a taken address is refused", async ({ page, request }) => {
    const email = uniqueEmail("pw");
    const other = uniqueEmail("pw-other");
    const { token } = await readyUser(request, email);
    await apiLogin(request, other);
    expect((await apiCall(request, "PUT", "/user/profile/password", { token, body: { newPassword: "Str0ngPass!word" } })).status).toBe(200);
    await uiLogin(page, email);

    await page.goto("/profile/settings");
    await page.getByRole("button", { name: "Change email" }).click();
    await page.getByLabel("New email").fill(other);
    await page.getByLabel("Your password, to confirm it's you").fill("Str0ngPass!word");
    await page.getByRole("button", { name: "Send code to new email" }).click();
    await expect(page.getByText("This email is already in use by another account")).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/email-4-taken.png` });

    await page.getByLabel("Your password, to confirm it's you").fill("wrong-password");
    await page.getByLabel("New email").fill(uniqueEmail("pw-new"));
    await page.getByRole("button", { name: "Send code to new email" }).click();
    await expect(page.getByText("That password isn't right")).toBeVisible();
  });
});
