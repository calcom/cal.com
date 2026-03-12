import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IAuthGoogleCalendarServiceDeps } from "../services/AuthGoogleCalendarService";
import { AuthGoogleCalendarService } from "../services/AuthGoogleCalendarService";

vi.mock("@calcom/lib/constants", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@calcom/lib/constants")>();
  return {
    ...actual,
    GOOGLE_CALENDAR_SCOPES: ["https://www.googleapis.com/auth/calendar"],
  };
});

describe("AuthGoogleCalendarService", () => {
  let service: AuthGoogleCalendarService;
  let mockDeps: IAuthGoogleCalendarServiceDeps;

  beforeEach(() => {
    mockDeps = {
      credentialRepository: {
        findFirstByAppIdAndUserId: vi.fn(),
        findFirstByUserIdAndType: vi.fn(),
        create: vi.fn(),
      } as any,
      buildCredentialCreateData: vi.fn().mockReturnValue({ id: "cred-1" }),
      log: { debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() } as any,
    };
    service = new AuthGoogleCalendarService(mockDeps);
  });

  describe("autoInstallIfEligible", () => {
    it("skips when provider is not google", async () => {
      await service.autoInstallIfEligible({
        userId: 1,
        account: { provider: "saml" } as any,
        grantedScopes: [],
      });

      expect(mockDeps.credentialRepository.findFirstByAppIdAndUserId).not.toHaveBeenCalled();
    });

    it("skips when user already has google-calendar credential", async () => {
      (mockDeps.credentialRepository.findFirstByAppIdAndUserId as any).mockResolvedValue({ id: 1 });

      await service.autoInstallIfEligible({
        userId: 1,
        account: { provider: "google", access_token: "tok" } as any,
        grantedScopes: ["https://www.googleapis.com/auth/calendar"],
      });

      expect(mockDeps.buildCredentialCreateData).not.toHaveBeenCalled();
    });

    it("skips when calendar scopes not granted", async () => {
      (mockDeps.credentialRepository.findFirstByAppIdAndUserId as any).mockResolvedValue(null);

      await service.autoInstallIfEligible({
        userId: 1,
        account: { provider: "google" } as any,
        grantedScopes: ["openid", "email"],
      });

      expect(mockDeps.buildCredentialCreateData).not.toHaveBeenCalled();
    });

    it("creates google-calendar credential when eligible", async () => {
      (mockDeps.credentialRepository.findFirstByAppIdAndUserId as any).mockResolvedValue(null);
      (mockDeps.credentialRepository.findFirstByUserIdAndType as any).mockResolvedValue(null);
      (mockDeps.credentialRepository.create as any).mockResolvedValue({
        id: 1,
        user: null,
        delegatedTo: null,
      });

      await service.autoInstallIfEligible({
        userId: 1,
        account: {
          provider: "google",
          access_token: "tok",
          refresh_token: "ref",
          id_token: "id",
          token_type: "bearer",
          expires_at: 12345,
        } as any,
        grantedScopes: ["https://www.googleapis.com/auth/calendar"],
      });

      expect(mockDeps.buildCredentialCreateData).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          appId: "google-calendar",
          type: "google_calendar",
        })
      );
    });
  });
});
