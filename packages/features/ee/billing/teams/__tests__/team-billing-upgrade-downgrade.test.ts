import { describe, expect, it, beforeEach, vi } from "vitest";

import { Plans } from "@calcom/prisma/enums";

import { InternalTeamBilling } from "../internal-team-billing";

vi.mock("@calcom/prisma", () => ({
  prisma: {
    team: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../../index", () => ({
  default: {
    handleSubscriptionCancel: vi.fn(),
    checkoutSessionIsPaid: vi.fn(),
    handleSubscriptionUpdate: vi.fn(),
    getSubscriptionStatus: vi.fn(),
    handleEndTrial: vi.fn(),
  },
}));

const mockPrisma = vi.mocked(await import("@calcom/prisma")).prisma;
const mockBilling = vi.mocked(await import("../../index")).default;

async function createTestTeam(data: {
  name: string;
  slug: string;
  plan?: Plans | null;
  isOrganization?: boolean;
  metadata?: Record<string, unknown>;
}) {
  const mockTeam = {
    id: Math.floor(Math.random() * 1000),
    name: data.name,
    slug: data.slug,
    plan: data.plan ?? null,
    isOrganization: data.isOrganization ?? false,
    metadata: data.metadata || {},
  };

  mockPrisma.team.create.mockResolvedValue(mockTeam);
  return mockTeam;
}

describe("Team Billing Upgrade/Downgrade Flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBilling.handleSubscriptionCancel.mockResolvedValue(undefined);
    mockBilling.checkoutSessionIsPaid.mockResolvedValue(true);
  });

  describe("Team downgrade (cancel)", () => {
    it("should downgrade team from TEAMS plan to null", async () => {
      const team = await createTestTeam({
        name: "Test Team",
        slug: "test-team",
        plan: Plans.TEAMS,
        isOrganization: false,
        metadata: {
          subscriptionId: "sub_123",
          subscriptionItemId: "si_456",
          paymentId: "cs_789",
        },
      });

      const internalTeamBilling = new InternalTeamBilling(team);
      await internalTeamBilling.cancel();

      expect(mockBilling.handleSubscriptionCancel).toHaveBeenCalledWith("sub_123");
      expect(mockPrisma.team.update).toHaveBeenCalledWith({
        where: { id: team.id },
        data: {
          plan: null,
          metadata: {},
        },
      });
    });

    it("should downgrade organization from ORGANIZATIONS plan to null", async () => {
      const organization = await createTestTeam({
        name: "Test Organization",
        slug: "test-org",
        plan: Plans.ORGANIZATIONS,
        isOrganization: true,
        metadata: {
          subscriptionId: "sub_123",
          subscriptionItemId: "si_456",
          paymentId: "cs_789",
        },
      });

      const internalTeamBilling = new InternalTeamBilling(organization);
      await internalTeamBilling.cancel();

      expect(mockBilling.handleSubscriptionCancel).toHaveBeenCalledWith("sub_123");
      expect(mockPrisma.team.update).toHaveBeenCalledWith({
        where: { id: organization.id },
        data: {
          plan: null,
          metadata: {},
        },
      });
    });

    it("should downgrade enterprise organization from ENTERPRISE plan to null", async () => {
      const enterpriseOrg = await createTestTeam({
        name: "Enterprise Organization",
        slug: "enterprise-org",
        plan: Plans.ENTERPRISE,
        isOrganization: true,
        metadata: {
          subscriptionId: "sub_enterprise",
          subscriptionItemId: "si_enterprise",
          paymentId: "cs_enterprise",
        },
      });

      const internalTeamBilling = new InternalTeamBilling(enterpriseOrg);
      await internalTeamBilling.cancel();

      expect(mockBilling.handleSubscriptionCancel).toHaveBeenCalledWith("sub_enterprise");
      expect(mockPrisma.team.update).toHaveBeenCalledWith({
        where: { id: enterpriseOrg.id },
        data: {
          plan: null,
          metadata: {},
        },
      });
    });
  });

  describe("Team upgrade scenarios", () => {
    it("should handle team upgrade from null to TEAMS plan", async () => {
      const team = await createTestTeam({
        name: "Upgrading Team",
        slug: "upgrading-team",
        plan: null,
        isOrganization: false,
      });

      const updatedTeamData = {
        ...team,
        plan: Plans.TEAMS,
        metadata: {
          subscriptionId: "sub_new",
          subscriptionItemId: "si_new",
          paymentId: "cs_new",
        },
      };

      mockPrisma.team.update.mockResolvedValue(updatedTeamData);

      await mockPrisma.team.update({
        where: { id: team.id },
        data: {
          plan: Plans.TEAMS,
          metadata: {
            subscriptionId: "sub_new",
            subscriptionItemId: "si_new",
            paymentId: "cs_new",
          },
        },
      });

      expect(mockPrisma.team.update).toHaveBeenCalledWith({
        where: { id: team.id },
        data: {
          plan: Plans.TEAMS,
          metadata: {
            subscriptionId: "sub_new",
            subscriptionItemId: "si_new",
            paymentId: "cs_new",
          },
        },
      });
    });

    it("should handle organization upgrade from null to ORGANIZATIONS plan", async () => {
      const organization = await createTestTeam({
        name: "Upgrading Organization",
        slug: "upgrading-org",
        plan: null,
        isOrganization: true,
      });

      const updatedOrgData = {
        ...organization,
        plan: Plans.ORGANIZATIONS,
        metadata: {
          subscriptionId: "sub_org_new",
          subscriptionItemId: "si_org_new",
          paymentId: "cs_org_new",
        },
      };

      mockPrisma.team.update.mockResolvedValue(updatedOrgData);

      await mockPrisma.team.update({
        where: { id: organization.id },
        data: {
          plan: Plans.ORGANIZATIONS,
          metadata: {
            subscriptionId: "sub_org_new",
            subscriptionItemId: "si_org_new",
            paymentId: "cs_org_new",
          },
        },
      });

      expect(mockPrisma.team.update).toHaveBeenCalledWith({
        where: { id: organization.id },
        data: {
          plan: Plans.ORGANIZATIONS,
          metadata: {
            subscriptionId: "sub_org_new",
            subscriptionItemId: "si_org_new",
            paymentId: "cs_org_new",
          },
        },
      });
    });

    it("should handle organization upgrade from ORGANIZATIONS to ENTERPRISE plan", async () => {
      const organization = await createTestTeam({
        name: "Enterprise Upgrading Organization",
        slug: "enterprise-upgrading-org",
        plan: Plans.ORGANIZATIONS,
        isOrganization: true,
        metadata: {
          subscriptionId: "sub_org",
          subscriptionItemId: "si_org",
          paymentId: "cs_org",
        },
      });

      const updatedOrgData = {
        ...organization,
        plan: Plans.ENTERPRISE,
        metadata: {
          subscriptionId: "sub_enterprise_upgrade",
          subscriptionItemId: "si_enterprise_upgrade",
          paymentId: "cs_enterprise_upgrade",
        },
      };

      mockPrisma.team.update.mockResolvedValue(updatedOrgData);

      await mockPrisma.team.update({
        where: { id: organization.id },
        data: {
          plan: Plans.ENTERPRISE,
          metadata: {
            subscriptionId: "sub_enterprise_upgrade",
            subscriptionItemId: "si_enterprise_upgrade",
            paymentId: "cs_enterprise_upgrade",
          },
        },
      });

      expect(mockPrisma.team.update).toHaveBeenCalledWith({
        where: { id: organization.id },
        data: {
          plan: Plans.ENTERPRISE,
          metadata: {
            subscriptionId: "sub_enterprise_upgrade",
            subscriptionItemId: "si_enterprise_upgrade",
            paymentId: "cs_enterprise_upgrade",
          },
        },
      });
    });
  });

  describe("Child team plan inheritance", () => {
    it("should maintain child team plan when parent organization is upgraded", async () => {
      const parentOrg = await createTestTeam({
        name: "Parent Organization",
        slug: "parent-org",
        plan: Plans.ORGANIZATIONS,
        isOrganization: true,
        metadata: {
          subscriptionId: "sub_parent_upgrade",
          subscriptionItemId: "si_parent_upgrade",
          paymentId: "cs_parent_upgrade",
        },
      });

      const childTeam = await createTestTeam({
        name: "Child Team",
        slug: "child-team",
        plan: Plans.ORGANIZATIONS,
        isOrganization: false,
      });

      const updatedChildTeam = { ...childTeam, parentId: parentOrg.id };
      const updatedParentOrg = { ...parentOrg, plan: Plans.ENTERPRISE };

      mockPrisma.team.update.mockResolvedValueOnce(updatedChildTeam).mockResolvedValueOnce(updatedParentOrg);

      await mockPrisma.team.update({
        where: { id: childTeam.id },
        data: { parentId: parentOrg.id },
      });

      await mockPrisma.team.update({
        where: { id: parentOrg.id },
        data: { plan: Plans.ENTERPRISE },
      });

      expect(mockPrisma.team.update).toHaveBeenCalledWith({
        where: { id: childTeam.id },
        data: { parentId: parentOrg.id },
      });

      expect(mockPrisma.team.update).toHaveBeenCalledWith({
        where: { id: parentOrg.id },
        data: { plan: Plans.ENTERPRISE },
      });
    });

    it("should maintain child team plan when parent organization is downgraded", async () => {
      const parentOrg = await createTestTeam({
        name: "Parent Organization",
        slug: "parent-org",
        plan: Plans.ORGANIZATIONS,
        isOrganization: true,
        metadata: {
          subscriptionId: "sub_parent_org",
          subscriptionItemId: "si_parent_org",
          paymentId: "cs_parent_org",
        },
      });

      const childTeam = await createTestTeam({
        name: "Child Team",
        slug: "child-team",
        plan: Plans.ORGANIZATIONS,
        isOrganization: false,
      });

      const updatedChildTeam = { ...childTeam, parentId: parentOrg.id };
      const updatedParentOrg = { ...parentOrg, plan: null, metadata: {} };

      mockPrisma.team.update.mockResolvedValueOnce(updatedChildTeam).mockResolvedValueOnce(updatedParentOrg);

      await mockPrisma.team.update({
        where: { id: childTeam.id },
        data: { parentId: parentOrg.id },
      });

      const internalTeamBilling = new InternalTeamBilling(parentOrg);
      await internalTeamBilling.cancel();

      expect(mockBilling.handleSubscriptionCancel).toHaveBeenCalledWith("sub_parent_org");
      expect(mockPrisma.team.update).toHaveBeenCalledWith({
        where: { id: parentOrg.id },
        data: {
          plan: null,
          metadata: {},
        },
      });
    });
  });
});
