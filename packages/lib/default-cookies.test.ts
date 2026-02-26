import { describe, expect, it } from "vitest";

import { defaultCookies } from "./default-cookies";

describe("defaultCookies", () => {
  describe("secure mode (useSecureCookies = true)", () => {
    const cookies = defaultCookies(true);

    it("prefixes cookie names with __Secure-", () => {
      expect(cookies.sessionToken.name).toBe("__Secure-next-auth.session-token");
      expect(cookies.callbackUrl.name).toBe("__Secure-next-auth.callback-url");
      expect(cookies.csrfToken.name).toBe("__Secure-next-auth.csrf-token");
      expect(cookies.pkceCodeVerifier.name).toBe("__Secure-next-auth.pkce.code_verifier");
      expect(cookies.state.name).toBe("__Secure-next-auth.state");
      expect(cookies.nonce.name).toBe("__Secure-next-auth.nonce");
    });

    it("sets sameSite to none for secure cookies", () => {
      expect(cookies.sessionToken.options.sameSite).toBe("none");
      expect(cookies.callbackUrl.options.sameSite).toBe("none");
    });

    it("sets secure flag to true", () => {
      expect(cookies.sessionToken.options.secure).toBe(true);
      expect(cookies.callbackUrl.options.secure).toBe(true);
    });

    it("sets httpOnly on sessionToken, csrfToken, pkceCodeVerifier, and state", () => {
      expect(cookies.sessionToken.options.httpOnly).toBe(true);
      expect(cookies.csrfToken.options.httpOnly).toBe(true);
      expect(cookies.pkceCodeVerifier.options.httpOnly).toBe(true);
      expect(cookies.state.options.httpOnly).toBe(true);
    });

    it("does not set httpOnly on callbackUrl", () => {
      expect(cookies.callbackUrl.options.httpOnly).toBeUndefined();
    });

    it("sets path to /", () => {
      expect(cookies.sessionToken.options.path).toBe("/");
      expect(cookies.callbackUrl.options.path).toBe("/");
    });
  });

  describe("non-secure mode (useSecureCookies = false)", () => {
    const cookies = defaultCookies(false);

    it("does not prefix cookie names", () => {
      expect(cookies.sessionToken.name).toBe("next-auth.session-token");
      expect(cookies.callbackUrl.name).toBe("next-auth.callback-url");
      expect(cookies.csrfToken.name).toBe("next-auth.csrf-token");
    });

    it("sets sameSite to lax for non-secure cookies", () => {
      expect(cookies.sessionToken.options.sameSite).toBe("lax");
      expect(cookies.callbackUrl.options.sameSite).toBe("lax");
    });

    it("sets secure flag to false", () => {
      expect(cookies.sessionToken.options.secure).toBe(false);
    });
  });

  describe("nonce cookie", () => {
    it("always uses lax sameSite regardless of secure mode", () => {
      const secureCookies = defaultCookies(true);
      const nonSecureCookies = defaultCookies(false);
      expect(secureCookies.nonce.options.sameSite).toBe("lax");
      expect(nonSecureCookies.nonce.options.sameSite).toBe("lax");
    });

    it("is always httpOnly", () => {
      const secureCookies = defaultCookies(true);
      expect(secureCookies.nonce.options.httpOnly).toBe(true);
    });

    it("does not set domain on nonce cookie", () => {
      const cookies = defaultCookies(true);
      expect(cookies.nonce.options).not.toHaveProperty("domain");
    });
  });
});
