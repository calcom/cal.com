import { createHmac, randomUUID } from "node:crypto";
import process from "node:process";
import { expect } from "@playwright/test";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { test } from "../lib/fixtures";

/**
 * Signs an OAuth state with HMAC-SHA256 nonce, mirroring the server's signOAuthState.
 * Requires NEXTAUTH_SECRET to match the running server's secret.
 */
function signState(state: Record<string, unknown>, userId: number): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET not available in test environment");
  const nonce = randomUUID();
  const nonceHash = createHmac("sha256", secret).update(`${nonce}:${userId}`).digest("hex");
  return JSON.stringify({ ...state, nonce, nonceHash });
}

function buildUnsignedState(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    returnTo: "https://attacker.example.com/controlled",
    onErrorReturnTo: "https://attacker.example.com/error",
    fromApp: true,
    ...overrides,
  });
}

test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

test.describe("OAuth CSRF Protection", () => {
  test.describe("Stripe callback - user cancellation flow", () => {
    const CALLBACK = "/api/integrations/stripepayment/callback";

    test("rejects unsigned state and falls back to default redirect", async ({ page, users }) => {
      const user = await users.create();
      await user.apiLogin();

      await page.goto(
        `${CALLBACK}?error=access_denied&state=${encodeURIComponent(buildUnsignedState())}`
      );

      await page.waitForURL((url) => !url.pathname.startsWith("/api/"));
      const finalUrl = page.url();

      // Unsigned state → decodeOAuthState returns undefined → default redirect
      expect(finalUrl).not.toContain("attacker");
      expect(finalUrl).toContain("/apps/installed");
    });

    test("honors valid signed state and redirects to onErrorReturnTo", async ({ page, users }) => {
      const user = await users.create();
      await user.apiLogin();

      // Use absolute URLs — getSafeRedirectUrl requires them
      const validState = signState(
        {
          returnTo: `${WEBAPP_URL}/apps/installed/payment`,
          onErrorReturnTo: `${WEBAPP_URL}/apps`,
          fromApp: true,
        },
        user.id
      );

      await page.goto(
        `${CALLBACK}?error=access_denied&state=${encodeURIComponent(validState)}`
      );

      await page.waitForURL((url) => !url.pathname.startsWith("/api/"));
      expect(page.url()).toContain("/apps");
    });

    test("rejects state signed with a different userId", async ({ page, users }) => {
      const user = await users.create();
      await user.apiLogin();

      // Attacker signed this state with their own userId
      const wrongUserState = signState(
        { onErrorReturnTo: `${WEBAPP_URL}/apps/specific-path`, fromApp: true },
        999999
      );

      await page.goto(
        `${CALLBACK}?error=access_denied&state=${encodeURIComponent(wrongUserState)}`
      );

      await page.waitForURL((url) => !url.pathname.startsWith("/api/"));
      const finalUrl = page.url();

      // HMAC verification fails → state is undefined → default redirect
      expect(finalUrl).not.toContain("specific-path");
      expect(finalUrl).toContain("/apps/installed");
    });

    test("returns 401 without session", async ({ page }) => {
      const response = await page.goto(`${CALLBACK}?code=test_code`);
      expect(response?.status()).toBe(401);
    });
  });

  test.describe("Dub callback - missing code flow", () => {
    const CALLBACK = "/api/integrations/dub/callback";

    test("blocks unsigned state — returns error instead of redirect", async ({ page, users }) => {
      const user = await users.create();
      await user.apiLogin();

      const response = await page.goto(`${CALLBACK}?state=${encodeURIComponent(buildUnsignedState())}`);

      // State decoding fails (no nonce) → state undefined → no onErrorReturnTo → error
      expect(response?.status()).toBeGreaterThanOrEqual(400);
    });

    test("redirects to onErrorReturnTo with valid signed state", async ({ page, users }) => {
      const user = await users.create();
      await user.apiLogin();

      // Use absolute URL — getSafeRedirectUrl requires it
      const validState = signState(
        { onErrorReturnTo: `${WEBAPP_URL}/apps/installed`, fromApp: true },
        user.id
      );

      await page.goto(`${CALLBACK}?state=${encodeURIComponent(validState)}`);

      // Valid state decoded → onErrorReturnTo present → redirect
      await page.waitForURL((url) => !url.pathname.startsWith("/api/"));
      expect(page.url()).toContain("/apps/installed");
    });

    test("returns error without session", async ({ page }) => {
      const response = await page.goto(`${CALLBACK}?code=test_code`);
      // Without session: HttpError(401) thrown — Next.js may return 401 or 500
      expect(response?.status()).toBeGreaterThanOrEqual(400);
    });
  });
});
