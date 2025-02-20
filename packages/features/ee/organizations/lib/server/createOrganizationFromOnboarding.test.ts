/**
 * Goal is to e2e test createOrganizationFromOnboarding except inviteMembersWithNoInviterPermissionCheck, createTeamsHandler and createDomain
 * Those are either already tested or should be tested out separately
 */
import prismock from "../../../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, vi, beforeEach } from "vitest";

import { createDomain } from "@calcom/lib/domainManager/organization";
import { MembershipRole } from "@calcom/prisma/enums";
import { createTeamsHandler } from "@calcom/trpc/server/routers/viewer/organizations/createTeams.handler";
import { inviteMembersWithNoInviterPermissionCheck } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/inviteMember.handler";

import { createOrganizationFromOnboarding } from "./createOrganizationFromOnboarding";

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

vi.mock("next-i18next", () => ({
  serverSideTranslations: vi.fn().mockImplementation(async () => {
    return {
      _nextI18Next: {
        initialI18nStore: {
          en: {
            common: {},
          },
        },
        userConfig: {
          i18n: {
            defaultLocale: "en",
            locales: ["en"],
          },
        },
      },
    };
  }),
  i18n: {
    language: "en",
    languages: ["en"],
    defaultLocale: "en",
    getFixedT: () => (key: string) => key,
  },
}));

vi.mock("@calcom/lib/domainManager/organization", () => ({
  createDomain: vi.fn(),
}));

const mockOrganizationOnboarding = {
  id: "onboard-id-1",
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

async function createTestOrganizationOnboarding(
  data?: Partial<typeof mockOrganizationOnboarding> & { organizationId?: number | null }
) {
  return prismock.organizationOnboarding.create({
    data: {
      ...mockOrganizationOnboarding,
      ...data,
    },
  });
}

async function createTestMembership(data: { userId: number; teamId: number; role?: MembershipRole }) {
  return prismock.membership.create({
    data: {
      userId: data.userId,
      teamId: data.teamId,
      role: data.role || MembershipRole.MEMBER,
      accepted: true,
    },
  });
}

describe("createOrganizationFromOnboarding", () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    // @ts-expect-error reset is a method on Prismock
    await prismock.reset();
  });

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

    const organizationOnboarding = await createTestOrganizationOnboarding({
      organizationId: existingOrg.id,
      name: orgName,
      slug: orgSlug,
    });

    await createTestUser({
      email: organizationOnboarding.orgOwnerEmail,
      name: "Existing User",
      username: "existinguser",
      onboardingCompleted: true,
      emailVerified: new Date(),
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
    const organizationOnboarding = await createTestOrganizationOnboarding();
    await createTestOrganization({
      name: "Existing Org",
      slug: organizationOnboarding.slug,
    });

    await createTestUser({
      email: organizationOnboarding.orgOwnerEmail,
      name: "Existing User",
      username: "existinguser",
      onboardingCompleted: true,
      emailVerified: new Date(),
    });

    await expect(
      createOrganizationFromOnboarding({
        organizationOnboarding,
        paymentSubscriptionId: "mock_subscription_id",
        paymentSubscriptionItemId: "mock_subscription_item_id",
      })
    ).rejects.toThrow("organization_url_taken");
  });

  it("should update stripe customer ID for existing user", async () => {
    const organizationOnboarding = await createTestOrganizationOnboarding();
    const existingUser = await createTestUser({
      email: organizationOnboarding.orgOwnerEmail,
      name: "Existing User",
      username: "existinguser",
      metadata: {},
      onboardingCompleted: true,
      emailVerified: new Date(),
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
});
