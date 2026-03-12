import { beforeEach, describe, expect, it, vi } from "vitest";

import { IdentityProvider } from "@calcom/prisma/enums";

import type { IAuthSignInServiceDeps } from "../services/AuthSignInService";
import { AuthSignInService } from "../services/AuthSignInService";

describe("AuthSignInService", () => {
  let service: AuthSignInService;
  let mockDeps: IAuthSignInServiceDeps;

  beforeEach(() => {
    mockDeps = {
      accountLinkingService: {
        handleOAuthSignIn: vi.fn().mockResolvedValue(true),
      } as any,
      log: { debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() } as any,
    };
    service = new AuthSignInService(mockDeps);
  });

  describe("deny-first checks", () => {
    it("allows email provider immediately", async () => {
      const result = await service.handleSignIn({
        user: { email: "test@test.com" } as any,
        account: { provider: "email", type: "email" } as any,
        profile: undefined,
      });
      expect(result).toBe(true);
    });

    it("allows non-saml-idp credentials immediately", async () => {
      const result = await service.handleSignIn({
        user: { email: "test@test.com" } as any,
        account: { provider: "credentials", type: "credentials" } as any,
        profile: undefined,
      });
      expect(result).toBe(true);
    });

    it("denies unsupported account type for non-saml-idp", async () => {
      const result = await service.handleSignIn({
        user: { email: "test@test.com" } as any,
        account: { provider: "unknown", type: "unknown" } as any,
        profile: undefined,
      });
      expect(result).toBe(false);
    });

    it("denies when email is missing", async () => {
      const result = await service.handleSignIn({
        user: { name: "Test" } as any,
        account: { provider: "google", type: "oauth" } as any,
        profile: undefined,
      });
      expect(result).toBe(false);
    });

    it("denies when name is missing", async () => {
      const result = await service.handleSignIn({
        user: { email: "test@test.com" } as any,
        account: { provider: "google", type: "oauth" } as any,
        profile: undefined,
      });
      expect(result).toBe(false);
    });

    it("denies unverified email", async () => {
      const result = await service.handleSignIn({
        user: {
          email: "test@test.com",
          name: "Test",
          email_verified: false,
          emailVerified: null,
        } as any,
        account: { provider: "google", type: "oauth" } as any,
        profile: { email_verified: false } as any,
      });
      expect(result).toBe("/auth/error?error=unverified-email");
    });
  });

  describe("delegation to account linking", () => {
    it("delegates valid OAuth to account linking service", async () => {
      const result = await service.handleSignIn({
        user: {
          email: "test@test.com",
          name: "Test",
          email_verified: true,
        } as any,
        account: { provider: "google", type: "oauth", providerAccountId: "gid-1" } as any,
        profile: undefined,
      });

      expect(result).toBe(true);
      expect(mockDeps.accountLinkingService.handleOAuthSignIn).toHaveBeenCalledWith(
        expect.objectContaining({
          idP: IdentityProvider.GOOGLE,
        })
      );
    });

    it("extracts SAML tenant from user.samlTenant", async () => {
      await service.handleSignIn({
        user: {
          email: "test@test.com",
          name: "Test",
          email_verified: true,
          samlTenant: "my-tenant",
        } as any,
        account: { provider: "saml", type: "oauth", providerAccountId: "saml-1" } as any,
        profile: undefined,
      });

      expect(mockDeps.accountLinkingService.handleOAuthSignIn).toHaveBeenCalledWith(
        expect.objectContaining({
          samlTenant: "my-tenant",
          idP: IdentityProvider.SAML,
        })
      );
    });

    it("handles saml-idp provider as OAuth", async () => {
      await service.handleSignIn({
        user: {
          email: "test@test.com",
          name: "Test",
          email_verified: true,
        } as any,
        account: { provider: "saml-idp", type: "credentials", providerAccountId: "sid-1" } as any,
        profile: undefined,
      });

      expect(mockDeps.accountLinkingService.handleOAuthSignIn).toHaveBeenCalled();
    });

    it("extracts SAML tenant from profile.requested.tenant", async () => {
      await service.handleSignIn({
        user: {
          email: "test@test.com",
          name: "Test",
          email_verified: true,
        } as any,
        account: { provider: "saml", type: "oauth", providerAccountId: "saml-1" } as any,
        profile: { requested: { tenant: "profile-tenant" } },
      });

      expect(mockDeps.accountLinkingService.handleOAuthSignIn).toHaveBeenCalledWith(
        expect.objectContaining({
          samlTenant: "profile-tenant",
        })
      );
    });
  });
});
