/**
 * Goal is to e2e test createOrganizationFromOnboarding except inviteMembersWithNoInviterPermissionCheck, createTeamsHandler and createDomain
 * Those are either already tested or should be tested out separately
 */
import prismock from "../../../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, vi, beforeEach } from "vitest";

import { LicenseKeySingleton } from "@calcom/ee/common/server/LicenseKeyService";
import * as constants from "@calcom/lib/constants";
import { createDomain } from "@calcom/lib/domainManager/organization";
import type { OrganizationOnboarding } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import { createTeamsHandler } from "@calcom/trpc/server/routers/viewer/organizations/createTeams.handler";
import { inviteMembersWithNoInviterPermissionCheck } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/inviteMember.handler";

import { createOrganizationFromOnboarding } from "./createOrganizationFromOnboarding";

vi.mock("@calcom/ee/common/server/LicenseKeyService", () => ({
  LicenseKeySingleton: {
    getInstance: vi.fn(),
  },
}));

// Mock the external functions
vi.mock("@calcom/features/auth/lib/verifyEmail", () => ({
  sendEmailVerification: vi.fn(),
}));

vi.mock("@calcom/emails/email-manager", () => ({
  sendOrganizationCreationEmail: vi.fn(),
}));

vi.mock("@calcom/trpc/server/routers/viewer/teams/inviteMember/inviteMember.handler", () => ({
  inviteMembersWithNoInviterPermissionCheck: vi.fn(),
}));

vi.mock("@calcom/trpc/server/routers/viewer/organizations/createTeams.handler", () => ({
  createTeamsHandler: vi.fn(),
}));

vi.mock("@calcom/lib/domainManager/organization", () => ({
  createDomain: vi.fn(),
}));

const mockOrganizationOnboarding = {
  name: "Test Org",
  slug: "test-org",
  orgOwnerEmail: "test@example.com",
  billingPeriod: "MONTHLY",
  seats: 5,
  pricePerSeat: 20,
  isComplete: false,
  stripeCustomerId: "mock_stripe_customer_id",
  createdById: 1,
  invitedMembers: [{ email: "member1@example.com" }, { email: "member2@example.com" }],
  teams: [
    { id: 1, name: "Team To Move", isBeingMigrated: true, slug: "new-team-slug" },
    { id: 2, name: "New Team", isBeingMigrated: false, slug: null },
  ],
  logo: null,
  bio: null,
  organizationId: null,
  isDomainConfigured: false,
  isPlatform: false,
};

// Helper functions for creating test scenarios
async function createTestUser(data: {
  email: string;
  name?: string;
  username?: string;
  metadata?: any;
  onboardingCompleted?: boolean;
  emailVerified?: Date | null;
}) {
  return prismock.user.create({
    data: {
      email: data.email,
      name: data.name || "Test User",
      username: data.username || "testuser",
      metadata: data.metadata || {},
      completedOnboarding: data.onboardingCompleted,
      emailVerified: data.emailVerified,
    },
  });
}

async function createTestOrganization(data: {
  name: string;
  slug: string;
  isOrganization?: boolean;
  metadata?: any;
}) {
  return prismock.team.create({
    data: {
      name: data.name,
      slug: data.slug,
      isOrganization: data.isOrganization ?? true,
      metadata: data.metadata || {},
    },
  });
}

async function createTestTeam(data: { name: string; slug: string }) {
  return prismock.team.create({
    data: {
      name: data.name,
      slug: data.slug,
      isOrganization: false,
    },
  });
}

async function createTestOrganizationOnboarding(
  data?: Partial<typeof mockOrganizationOnboarding> & { organizationId?: number | null }
) {
  console.log("TEST: Creating organization onboarding", data);
  return prismock.organizationOnboarding.create({
    data: {
      ...mockOrganizationOnboarding,
      ...data,
    },
  });
}

async function createOnboardingEligibleUserAndOnboarding(data: {
  user?: {
    email: string;
    name?: string;
    username?: string;
  };
  organizationOnboarding?: Partial<typeof mockOrganizationOnboarding> & { organizationId?: number | null };
}) {
  const user = await createTestUser({
    ...data.user,
    onboardingCompleted: true,
    emailVerified: new Date(),
  });
  const organizationOnboarding = await createTestOrganizationOnboarding({
    ...data.organizationOnboarding,
    createdById: user.id,
  });
  return { user, organizationOnboarding };
}

async function createTestMembership(data: { userId: number; teamId: number; role?: MembershipRole }) {
  return prismock.membership.create({
    data: {
      createdAt: new Date(),
      userId: data.userId,
      teamId: data.teamId,
      role: data.role || MembershipRole.MEMBER,
      accepted: true,
    },
  });
}

async function expectOrganizationOnboardingToHaveDataContaining({
  onboardingId,
  expectedData,
}: {
  onboardingId: string;
  expectedData: Partial<OrganizationOnboarding>;
}) {
  const updatedOrganizationOnboarding = await prismock.organizationOnboarding.findUnique({
    where: { id: onboardingId },
  });
  expect(updatedOrganizationOnboarding).toEqual(expect.objectContaining(expectedData));
}

describe("createOrganizationFromOnboarding", () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    // @ts-expect-error reset is a method on Prismock
    await prismock.reset();
  });

  describe("hosted", () => {
    beforeEach(() => {
      vi.spyOn(constants, "IS_SELF_HOSTED", "get").mockReturnValue(false);
    });

    // Skipped because non-existend user creation support isn't there through onboarding now.
    it.skip("should create an organization with a non-existent user as owner", async () => {
      const organizationOnboarding = await createTestOrganizationOnboarding();

      const { organization, owner } = await createOrganizationFromOnboarding({
        organizationOnboarding,
        paymentSubscriptionId: "mock_subscription_id",
        paymentSubscriptionItemId: "mock_subscription_item_id",
      });

      // Verify organization creation
      expect(organization).toBeDefined();
      expect(organization.name).toBe(organizationOnboarding.name);
      expect(organization.slug).toBe(organizationOnboarding.slug);
      expect(organization.metadata).toEqual({
        orgSeats: 5,
        orgPricePerSeat: 20,
        billingPeriod: "MONTHLY",
        subscriptionId: "mock_subscription_id",
        subscriptionItemId: "mock_subscription_item_id",
      });

      // Verify owner creation
      expect(owner).toBeDefined();
      expect(owner.email).toBe(organizationOnboarding.orgOwnerEmail);
    });

    it("should create an organization with an existing user as owner", async () => {
      const orgOwnerEmail = "test@example.com";
      const existingUser = await createTestUser({
        email: orgOwnerEmail,
        name: "Existing User",
        username: "existinguser",
        onboardingCompleted: true,
        emailVerified: new Date(),
      });

      const organizationOnboarding = await createTestOrganizationOnboarding({
        orgOwnerEmail,
      });

      const { organization, owner } = await createOrganizationFromOnboarding({
        organizationOnboarding,
        paymentSubscriptionId: "mock_subscription_id",
        paymentSubscriptionItemId: "mock_subscription_item_id",
      });

      // Verify organization creation
      expect(organization).toBeDefined();
      expect(organization.name).toBe(organizationOnboarding.name);
      expect(organization.slug).toBe(organizationOnboarding.slug);

      // Verify owner is the existing user
      expect(owner.id).toBe(existingUser.id);
      expect(owner.email).toBe(existingUser.email);

      expect(createDomain).toHaveBeenCalledWith(organization.slug);
      // Verify team creation and member invites still work
      expect(inviteMembersWithNoInviterPermissionCheck).toHaveBeenCalledWith(
        expect.objectContaining({
          orgSlug: organization.slug,
          teamId: organization.id,
          invitations: organizationOnboarding.invitedMembers?.map((member) => ({
            usernameOrEmail: member.email,
            role: MembershipRole.MEMBER,
          })),
        })
      );
      expect(createTeamsHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            orgId: organization.id,
            teamNames: ["New Team"],
            moveTeams: expect.arrayContaining([expect.objectContaining({ id: 1, newSlug: "new-team-slug" })]),
          }),
        })
      );
    });

    it("should reuse existing organization if organizationId is already set in onboarding. Covers the retry scenario where org got created but then error occurred", async () => {
      const orgName = "Existing Org";
      const orgSlug = "existing-org";
      const existingOrg = await createTestOrganization({
        name: orgName,
        slug: orgSlug,
      });

      const { organizationOnboarding } = await createOnboardingEligibleUserAndOnboarding({
        user: {
          name: "Existing User",
          username: "existinguser",
          email: "test@example.com",
        },
        organizationOnboarding: {
          organizationId: existingOrg.id,
          name: orgName,
          slug: orgSlug,
        },
      });

      const { organization } = await createOrganizationFromOnboarding({
        organizationOnboarding,
        paymentSubscriptionId: "mock_subscription_id",
        paymentSubscriptionItemId: "mock_subscription_item_id",
      });

      // Verify the existing organization was reused
      expect(organization.id).toBe(existingOrg.id);
    });

    it("should throw error if organization with same slug exists", async () => {
      const { organizationOnboarding } = await createOnboardingEligibleUserAndOnboarding({
        user: {
          email: "test@example.com",
        },
        organizationOnboarding: {
          slug: "conflicting-org-with-same-slug",
        },
      });

      await createTestOrganization({
        name: "Conflicting Org with same slug",
        slug: organizationOnboarding.slug,
      });

      await expect(
        createOrganizationFromOnboarding({
          organizationOnboarding,
          paymentSubscriptionId: "mock_subscription_id",
          paymentSubscriptionItemId: "mock_subscription_item_id",
        })
      ).rejects.toThrow("organization_url_taken");
    });

    it("should create team with slugified slug", async () => {
      const teamToMove = await createTestTeam({
        name: "Sales",
        slug: "Company Sales",
      });

      const { organizationOnboarding } = await createOnboardingEligibleUserAndOnboarding({
        user: {
          email: "test@example.com",
        },
        organizationOnboarding: {
          slug: "UPPERCASE-SLUG",
          teams: [{ id: teamToMove.id, name: "Sales", isBeingMigrated: true, slug: "sales-team" }],
        },
      });

      const { organization } = await createOrganizationFromOnboarding({
        organizationOnboarding,
        paymentSubscriptionId: "mock_subscription_id",
        paymentSubscriptionItemId: "mock_subscription_item_id",
      });

      expect(createTeamsHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            orgId: organization.id,
            teamNames: [],
            moveTeams: expect.arrayContaining([expect.objectContaining({ id: 1, newSlug: "sales-team" })]),
          }),
        })
      );
    });

    it("should update stripe customer ID for existing user", async () => {
      const { user: existingUser, organizationOnboarding } = await createOnboardingEligibleUserAndOnboarding({
        user: {
          email: "test@example.com",
        },
        organizationOnboarding: {
          slug: "conflicting-org-with-same-slug",
        },
      });

      await createOrganizationFromOnboarding({
        organizationOnboarding,
        paymentSubscriptionId: "mock_subscription_id",
        paymentSubscriptionItemId: "mock_subscription_item_id",
      });

      // Verify user's stripe customer ID was updated
      const updatedUser = await prismock.user.findUnique({
        where: { id: existingUser.id },
      });

      expect(updatedUser?.metadata).toEqual(
        expect.objectContaining({
          stripeCustomerId: organizationOnboarding.stripeCustomerId,
        })
      );
    });

    it("should create organization in with slug set even if there is a team with same slug of which orgOwner(to-be) is a member", async () => {
      const { organizationOnboarding } = await createOnboardingEligibleUserAndOnboarding({
        user: {
          email: "test@example.com",
        },
        organizationOnboarding: {
          slug: "conflicting-org-with-same-slug",
        },
      });

      const teamWithConflictingSlug = await createTestTeam({
        name: "TestTeamWithConflictingSlug",
        slug: organizationOnboarding.slug,
      });

      // Make the orgOwner a member of the team
      await createTestMembership({
        userId: organizationOnboarding.createdById,
        teamId: teamWithConflictingSlug.id,
        role: MembershipRole.ADMIN,
      });

      const { organization } = await createOrganizationFromOnboarding({
        organizationOnboarding,
        paymentSubscriptionId: "mock_subscription_id",
        paymentSubscriptionItemId: "mock_subscription_item_id",
      });

      expect(organization.slug).toBe(organizationOnboarding.slug);
    });

    it("should not create organization if there is a team with same slug of which orgOwner(to-be) is not a member", async () => {
      const { organizationOnboarding } = await createOnboardingEligibleUserAndOnboarding({
        user: {
          email: "test@example.com",
        },
        organizationOnboarding: {
          slug: "conflicting-org-with-same-slug",
        },
      });

      await createTestTeam({
        name: "TestTeamWithConflictingSlugNotOwnedByOrgOwner",
        slug: organizationOnboarding.slug,
      });

      // Don't make the orgOwner a member of the team
      // await createTestMembership({
      //   userId: organizationOnboarding.createdById,
      //   teamId: teamWithConflictingSlug.id,
      //   role: MembershipRole.ADMIN,
      // });

      await expect(
        createOrganizationFromOnboarding({
          organizationOnboarding,
          paymentSubscriptionId: "mock_subscription_id",
          paymentSubscriptionItemId: "mock_subscription_item_id",
        })
      ).rejects.toThrow("organization_url_taken");
    });

    it("should not mark the Onboarding as completed(isComplete=true)", async () => {
      const { organizationOnboarding } = await createOnboardingEligibleUserAndOnboarding({
        user: {
          email: "test@example.com",
        },
      });

      await expectOrganizationOnboardingToHaveDataContaining({
        onboardingId: organizationOnboarding.id,
        expectedData: {
          isComplete: false,
        },
      });
    });
  });

  describe("self-hosted", () => {
    beforeEach(() => {
      vi.spyOn(constants, "IS_SELF_HOSTED", "get").mockReturnValue(true);
    });

    it("should fail if the license is invalid", async () => {
      vi.mocked(LicenseKeySingleton.getInstance as ReturnType<typeof vi.fn>).mockResolvedValue({
        checkLicense: vi.fn().mockResolvedValue(false),
      });
      const { organizationOnboarding } = await createOnboardingEligibleUserAndOnboarding({
        user: {
          email: "test@example.com",
        },
      });

      await expect(
        createOrganizationFromOnboarding({
          organizationOnboarding,
          paymentSubscriptionId: "mock_subscription_id",
          paymentSubscriptionItemId: "mock_subscription_item_id",
        })
      ).rejects.toThrow("Self hosted license not valid");
    });

    it("should create an organization with a valid license", async () => {
      vi.mocked(LicenseKeySingleton.getInstance).mockResolvedValue({
        checkLicense: vi.fn().mockResolvedValue(true),
      });
      const { organizationOnboarding } = await createOnboardingEligibleUserAndOnboarding({
        user: {
          email: "test@example.com",
        },
      });

      const { organization, owner } = await createOrganizationFromOnboarding({
        organizationOnboarding,
        paymentSubscriptionId: "mock_subscription_id",
        paymentSubscriptionItemId: "mock_subscription_item_id",
      });

      expect(organization).toBeDefined();
      expect(owner).toBeDefined();
    });
  });
});
