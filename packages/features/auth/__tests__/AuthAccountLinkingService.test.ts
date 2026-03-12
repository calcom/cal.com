import { beforeEach, describe, expect, it, vi } from "vitest";

import { IdentityProvider } from "@calcom/prisma/enums";

import type { IAuthAccountLinkingServiceDeps } from "../services/AuthAccountLinkingService";
import { AuthAccountLinkingService } from "../services/AuthAccountLinkingService";

describe("AuthAccountLinkingService", () => {
  let service: AuthAccountLinkingService;
  let mockDeps: IAuthAccountLinkingServiceDeps;

  beforeEach(() => {
    mockDeps = {
      authAccountRepo: {
        findByIdentityProviderWithAccountsForProvider: vi.fn(),
        findAndFixLegacyIdentityProviderId: vi.fn(),
        findByEmailWithPassword: vi.fn(),
        updateIdentityProvider: vi.fn(),
        updateIdentityProviderAndEmail: vi.fn(),
        updateEmail: vi.fn(),
        claimInvitedUser: vi.fn(),
      } as any,
      orgAutoLinkService: {
        checkOrgMembership: vi.fn().mockResolvedValue({ orgUsername: "user", orgId: undefined }),
      } as any,
      validateSamlAccountConversion: vi.fn().mockResolvedValue({ allowed: true }),
      calcomAdapter: {
        linkAccount: vi.fn(),
      } as any,
      loginWithTotp: vi.fn().mockResolvedValue("/auth/login?totp=jwt"),
      hostedCal: false,
      log: { debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() } as any,
      prisma: {
        user: {
          findFirst: vi.fn(),
          create: vi.fn().mockResolvedValue({ id: 99, email: "new@test.com", username: "newuser" }),
        },
      } as any,
    };
    service = new AuthAccountLinkingService(mockDeps);
  });

  describe("handleOAuthSignIn", () => {
    const baseParams = {
      user: { id: "1", email: "test@test.com", name: "Test" } as any,
      account: { provider: "google", providerAccountId: "gid-123", type: "oauth" } as any,
      profile: undefined,
      idP: IdentityProvider.GOOGLE,
      samlTenant: undefined as string | undefined,
    };

    describe("existing user by identity provider", () => {
      it("allows login when existing user email matches", async () => {
        (mockDeps.authAccountRepo.findByIdentityProviderWithAccountsForProvider as any).mockResolvedValue({
          id: 1,
          email: "test@test.com",
          twoFactorEnabled: false,
          accounts: [{ id: 1 }],
        });

        const result = await service.handleOAuthSignIn(baseParams);

        expect(result).toBe(true);
      });

      it("redirects to TOTP when existing user has 2FA enabled", async () => {
        (mockDeps.authAccountRepo.findByIdentityProviderWithAccountsForProvider as any).mockResolvedValue({
          id: 1,
          email: "test@test.com",
          twoFactorEnabled: true,
          identityProvider: IdentityProvider.GOOGLE,
          accounts: [{ id: 1 }],
        });

        const result = await service.handleOAuthSignIn(baseParams);

        expect(result).toContain("/auth/login?totp=");
      });

      it("links account when existing user has no accounts", async () => {
        (mockDeps.authAccountRepo.findByIdentityProviderWithAccountsForProvider as any).mockResolvedValue({
          id: 1,
          email: "test@test.com",
          twoFactorEnabled: false,
          accounts: [],
        });

        const result = await service.handleOAuthSignIn(baseParams);

        expect(result).toBe(true);
        expect(mockDeps.calcomAdapter.linkAccount).toHaveBeenCalled();
      });

      it("returns error when email changed and conflicts with another user", async () => {
        (mockDeps.authAccountRepo.findByIdentityProviderWithAccountsForProvider as any).mockResolvedValue({
          id: 1,
          email: "old@test.com",
          twoFactorEnabled: false,
          accounts: [],
        });
        mockDeps.prisma.user.findFirst.mockResolvedValue({ id: 2, email: "test@test.com" });

        const result = await service.handleOAuthSignIn(baseParams);

        expect(result).toBe("/auth/error?error=new-email-conflict");
      });

      it("updates email when changed and no conflict exists", async () => {
        (mockDeps.authAccountRepo.findByIdentityProviderWithAccountsForProvider as any).mockResolvedValue({
          id: 1,
          email: "old@test.com",
          twoFactorEnabled: false,
          accounts: [],
        });
        mockDeps.prisma.user.findFirst.mockResolvedValue(null);

        const result = await service.handleOAuthSignIn(baseParams);

        expect(result).toBe(true);
        expect(mockDeps.authAccountRepo.updateEmail).toHaveBeenCalledWith(1, "test@test.com");
      });
    });

    describe("existing user by email (no IdP match)", () => {
      beforeEach(() => {
        (mockDeps.authAccountRepo.findByIdentityProviderWithAccountsForProvider as any).mockResolvedValue(
          null
        );
        (mockDeps.authAccountRepo.findAndFixLegacyIdentityProviderId as any).mockResolvedValue(null);
      });

      it("returns wrong-provider error when identityProvider is CAL and user is not invited", async () => {
        (mockDeps.authAccountRepo.findByEmailWithPassword as any).mockResolvedValue({
          id: 1,
          email: "test@test.com",
          identityProvider: IdentityProvider.CAL,
          emailVerified: null,
          twoFactorEnabled: false,
          password: { hash: "some-hash" },
          username: "existing-user",
        });

        const result = await service.handleOAuthSignIn(baseParams);

        expect(result).toContain("/auth/error");
      });

      it("claims invited user (no password, not verified, no username)", async () => {
        (mockDeps.authAccountRepo.findByEmailWithPassword as any).mockResolvedValue({
          id: 1,
          email: "test@test.com",
          identityProvider: IdentityProvider.CAL,
          emailVerified: null,
          twoFactorEnabled: false,
          password: null,
          username: null,
        });

        const result = await service.handleOAuthSignIn(baseParams);

        expect(result).toBe(true);
        expect(mockDeps.authAccountRepo.claimInvitedUser).toHaveBeenCalled();
      });

      it("validates SAML authority before claiming invited user", async () => {
        (mockDeps.authAccountRepo.findByEmailWithPassword as any).mockResolvedValue({
          id: 1,
          email: "test@test.com",
          identityProvider: IdentityProvider.CAL,
          emailVerified: null,
          twoFactorEnabled: false,
          password: null,
          username: null,
        });
        (mockDeps.validateSamlAccountConversion as any).mockResolvedValue({
          allowed: false,
          errorUrl: "/auth/error?error=saml-denied",
        });

        const result = await service.handleOAuthSignIn({
          ...baseParams,
          idP: IdentityProvider.SAML,
          samlTenant: "tenant-1",
        });

        expect(result).toBe("/auth/error?error=saml-denied");
      });

      it("upgrades CAL user to Google when email is verified", async () => {
        (mockDeps.authAccountRepo.findByEmailWithPassword as any).mockResolvedValue({
          id: 1,
          email: "test@test.com",
          identityProvider: IdentityProvider.CAL,
          emailVerified: new Date(),
          twoFactorEnabled: false,
          password: { hash: "some-hash" },
          username: "existing-user",
        });

        const result = await service.handleOAuthSignIn(baseParams);

        expect(result).toBe(true);
        expect(mockDeps.authAccountRepo.updateIdentityProviderAndEmail).toHaveBeenCalledWith(
          1,
          IdentityProvider.GOOGLE,
          "gid-123",
          "test@test.com"
        );
      });

      it("blocks CAL to OAuth upgrade when email is unverified", async () => {
        (mockDeps.authAccountRepo.findByEmailWithPassword as any).mockResolvedValue({
          id: 1,
          email: "test@test.com",
          identityProvider: IdentityProvider.CAL,
          emailVerified: null,
          twoFactorEnabled: false,
          password: { hash: "some-hash" },
          username: "existing-user",
        });

        const result = await service.handleOAuthSignIn(baseParams);

        expect(result).toBe("/auth/error?error=unverified-email");
      });

      it("upgrades Google user to SAML after validation (hosted)", async () => {
        // Must be hosted to bypass self-hosted auto-merge path
        mockDeps.hostedCal = true;
        service = new AuthAccountLinkingService(mockDeps);

        (mockDeps.authAccountRepo.findByEmailWithPassword as any).mockResolvedValue({
          id: 1,
          email: "test@test.com",
          identityProvider: IdentityProvider.GOOGLE,
          emailVerified: new Date(),
          twoFactorEnabled: false,
          password: null,
          username: "existing-user",
        });

        const result = await service.handleOAuthSignIn({
          ...baseParams,
          idP: IdentityProvider.SAML,
          samlTenant: "tenant-1",
        });

        expect(result).toBe(true);
        expect(mockDeps.authAccountRepo.updateIdentityProviderAndEmail).toHaveBeenCalledWith(
          1,
          IdentityProvider.SAML,
          "gid-123",
          "test@test.com"
        );
      });

      it("returns wrong-provider when provider mismatch has no upgrade path (hosted)", async () => {
        // Must be hosted to bypass self-hosted auto-merge path
        mockDeps.hostedCal = true;
        service = new AuthAccountLinkingService(mockDeps);

        (mockDeps.authAccountRepo.findByEmailWithPassword as any).mockResolvedValue({
          id: 1,
          email: "test@test.com",
          identityProvider: IdentityProvider.SAML,
          emailVerified: new Date(),
          twoFactorEnabled: false,
          password: null,
          username: "existing-user",
        });

        const result = await service.handleOAuthSignIn(baseParams);

        expect(result).toContain("/auth/error?error=wrong-provider");
      });
    });

    describe("self-hosted auto-merge", () => {
      beforeEach(() => {
        (mockDeps.authAccountRepo.findByIdentityProviderWithAccountsForProvider as any).mockResolvedValue(
          null
        );
        (mockDeps.authAccountRepo.findAndFixLegacyIdentityProviderId as any).mockResolvedValue(null);
        mockDeps.hostedCal = false;
      });

      it("auto-merges when email is verified and provider is not CAL on self-hosted", async () => {
        (mockDeps.authAccountRepo.findByEmailWithPassword as any).mockResolvedValue({
          id: 1,
          email: "test@test.com",
          identityProvider: IdentityProvider.GOOGLE,
          emailVerified: new Date(),
          twoFactorEnabled: false,
          password: null,
          username: "existing-user",
        });

        const result = await service.handleOAuthSignIn(baseParams);

        expect(result).toBe(true);
      });

      it("does not auto-merge on hosted cal", async () => {
        mockDeps.hostedCal = true;
        service = new AuthAccountLinkingService(mockDeps);

        (mockDeps.authAccountRepo.findByEmailWithPassword as any).mockResolvedValue({
          id: 1,
          email: "test@test.com",
          identityProvider: IdentityProvider.GOOGLE,
          emailVerified: new Date(),
          twoFactorEnabled: false,
          password: null,
          username: "existing-user",
        });

        const result = await service.handleOAuthSignIn(baseParams);

        // On hosted, same provider mismatch scenario -> wrong-provider
        expect(result).toContain("/auth/error?error=wrong-provider");
      });
    });

    describe("new user creation", () => {
      beforeEach(() => {
        (mockDeps.authAccountRepo.findByIdentityProviderWithAccountsForProvider as any).mockResolvedValue(
          null
        );
        (mockDeps.authAccountRepo.findAndFixLegacyIdentityProviderId as any).mockResolvedValue(null);
        (mockDeps.authAccountRepo.findByEmailWithPassword as any).mockResolvedValue(null);
      });

      it("creates new user when no existing user found", async () => {
        const result = await service.handleOAuthSignIn(baseParams);

        expect(result).toBe(true);
        expect(mockDeps.prisma.user.create).toHaveBeenCalled();
      });

      it("links account for newly created user", async () => {
        await service.handleOAuthSignIn(baseParams);

        expect(mockDeps.calcomAdapter.linkAccount).toHaveBeenCalled();
      });

      it("returns error when user creation fails", async () => {
        mockDeps.prisma.user.create.mockRejectedValue(new Error("DB error"));

        const result = await service.handleOAuthSignIn(baseParams);

        expect(result).toBe("/auth/error?error=user-creation-error");
      });
    });
  });
});
