import { beforeEach, describe, expect, it, vi } from "vitest";

import { IdentityProvider } from "@calcom/prisma/enums";

import { AuthOrgAutoLinkService } from "../services/AuthOrgAutoLinkService";

describe("AuthOrgAutoLinkService", () => {
  let service: AuthOrgAutoLinkService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      team: {
        findFirst: vi.fn(),
      },
    };
  });

  describe("checkOrgMembership", () => {
    it("returns undefined orgId when ORGANIZATIONS_AUTOLINK is false", async () => {
      service = new AuthOrgAutoLinkService(mockPrisma, false);

      const result = await service.checkOrgMembership(IdentityProvider.GOOGLE, "user@example.com");

      expect(result).toEqual({ orgUsername: "user", orgId: undefined });
      expect(mockPrisma.team.findFirst).not.toHaveBeenCalled();
    });

    it("returns undefined orgId when idP is not GOOGLE", async () => {
      service = new AuthOrgAutoLinkService(mockPrisma, true);

      const result = await service.checkOrgMembership(IdentityProvider.SAML, "user@example.com");

      expect(result).toEqual({ orgUsername: "user", orgId: undefined });
      expect(mockPrisma.team.findFirst).not.toHaveBeenCalled();
    });

    it("returns orgId when verified org matches email domain", async () => {
      service = new AuthOrgAutoLinkService(mockPrisma, true);
      mockPrisma.team.findFirst.mockResolvedValue({ id: 42 });

      const result = await service.checkOrgMembership(IdentityProvider.GOOGLE, "user@example.com");

      expect(result).toEqual({ orgUsername: "user", orgId: 42 });
      expect(mockPrisma.team.findFirst).toHaveBeenCalledWith({
        where: {
          organizationSettings: {
            isOrganizationVerified: true,
            orgAutoAcceptEmail: "example.com",
          },
        },
        select: { id: true },
      });
    });

    it("returns undefined orgId when no org matches domain", async () => {
      service = new AuthOrgAutoLinkService(mockPrisma, true);
      mockPrisma.team.findFirst.mockResolvedValue(null);

      const result = await service.checkOrgMembership(IdentityProvider.GOOGLE, "user@unknown.com");

      expect(result).toEqual({ orgUsername: "user", orgId: undefined });
    });
  });
});
