import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IAuthSessionServiceDeps } from "../services/AuthSessionService";
import { AuthSessionService } from "../services/AuthSessionService";

describe("AuthSessionService", () => {
  let service: AuthSessionService;
  let mockDeps: IAuthSessionServiceDeps;

  beforeEach(() => {
    mockDeps = {
      googleCalendarService: { autoInstallIfEligible: vi.fn() } as any,
      prisma: {
        user: { findFirst: vi.fn() },
        membership: { findUnique: vi.fn() },
      } as any,
      profileRepository: {
        findAllProfilesForUserIncludingMovedUser: vi.fn().mockResolvedValue([]),
        findByUpIdWithAuth: vi.fn(),
      } as any,
      licenseKeyService: { checkLicense: vi.fn().mockResolvedValue(true) } as any,
      log: { debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() } as any,
    };
    service = new AuthSessionService(mockDeps);
  });

  describe("enrichToken", () => {
    it("merges session data on update trigger", async () => {
      const token = {
        sub: "1",
        profileId: null,
        upId: null,
        locale: "en",
        name: "Old",
        username: "old",
        email: "old@test.com",
      } as any;
      const session = { name: "New", locale: "fr" };

      const result = await service.enrichToken({ token, trigger: "update", session });

      expect(result.name).toBe("New");
      expect(result.locale).toBe("fr");
    });

    it("preserves token values when session fields are missing on update", async () => {
      const token = {
        sub: "1",
        profileId: "p1",
        upId: "up1",
        locale: "en",
        name: "Test",
        username: "test",
        email: "test@test.com",
      } as any;

      const result = await service.enrichToken({ token, trigger: "update", session: {} });

      expect(result.profileId).toBe("p1");
      expect(result.upId).toBe("up1");
      expect(result.name).toBe("Test");
    });

    it("returns token unchanged when no user and no account (no existing user)", async () => {
      const token = { sub: "1", email: "noone@test.com" } as any;
      mockDeps.prisma.user.findFirst.mockResolvedValue(null);

      const result = await service.enrichToken({ token });

      expect(result).toEqual(token);
    });

    it("calls autoMergeIdentities when no user is present", async () => {
      const token = { sub: "1", email: "test@test.com" } as any;
      mockDeps.prisma.user.findFirst.mockResolvedValue(null);

      await service.enrichToken({ token });

      expect(mockDeps.prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: "test@test.com" },
        })
      );
    });

    it("returns token when user exists but no account", async () => {
      const token = { sub: "1" } as any;
      const user = { id: 1, email: "test@test.com" } as any;

      const result = await service.enrichToken({ token, user });

      expect(result).toEqual(token);
    });

    it("handles credentials account type", async () => {
      const token = { sub: "1" } as any;
      const user = {
        id: 1,
        name: "Test",
        username: "test",
        email: "test@test.com",
        role: "USER",
        profile: { id: 10, upId: "up-10" },
      } as any;
      const account = { type: "credentials", provider: "credentials" } as any;

      const result = await service.enrichToken({ token, user, account });

      expect(result.id).toBe(1);
      expect(result.name).toBe("Test");
      expect(result.email).toBe("test@test.com");
      expect(result.profileId).toBe(10);
      expect(result.upId).toBe("up-10");
    });

    it("handles saml-idp credentials specially", async () => {
      const token = { sub: "original-sub", upId: null } as any;
      const user = { userId: 42, profile: { upId: "saml-up-1" } } as any;
      const account = { type: "credentials", provider: "saml-idp" } as any;

      const result = await service.enrichToken({ token, user, account });

      expect(result.sub).toBe("42");
      expect(result.upId).toBe("saml-up-1");
    });
  });

  describe("buildSession", () => {
    it("includes license validity in session", async () => {
      const session = { user: {} } as any;
      const token = { id: 1, name: "Test", username: "test", role: "USER" } as any;

      const result = await service.buildSession(session, token);

      expect(result.hasValidLicense).toBe(true);
    });

    it("maps token fields to session user", async () => {
      const session = { user: {} } as any;
      const token = {
        id: 1,
        name: "Test User",
        username: "testuser",
        orgAwareUsername: "testuser",
        role: "USER",
        impersonatedBy: undefined,
        belongsToActiveTeam: true,
        org: null,
        locale: "en",
        profileId: "p1",
        upId: "up1",
      } as any;

      const result = await service.buildSession(session, token);

      expect(result.user.id).toBe(1);
      expect(result.user.name).toBe("Test User");
      expect(result.user.username).toBe("testuser");
      expect(result.user.belongsToActiveTeam).toBe(true);
      expect(result.profileId).toBe("p1");
      expect(result.upId).toBe("up1");
    });

    it("returns false license when check fails", async () => {
      mockDeps.licenseKeyService.checkLicense.mockResolvedValue(false);
      const session = { user: {} } as any;
      const token = { id: 1, name: "Test", username: "test", role: "USER" } as any;

      const result = await service.buildSession(session, token);

      expect(result.hasValidLicense).toBe(false);
    });
  });
});
