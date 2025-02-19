import prismock from "../../../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, vi, beforeEach } from "vitest";

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
  invitedMembers: [{ email: "member1@example.com" }, { email: "member2@example.com" }],
  teams: [
    { id: 1, name: "Team 1", isBeingMigrated: true, slug: "team-1" },
    { id: 2, name: "Team 2", isBeingMigrated: false, slug: null },
  ],
  logo: null,
  bio: null,
  organizationId: null,
  isDomainConfigured: true,
  isPlatform: false,
};

// Helper functions for creating test scenarios
async function createTestUser(data: {
  email: string;
  name?: string;
  username?: string;
  metadata?: any;
  onboardingCompleted?: boolean;
  emailVerified?: boolean;
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

async function createTestOrganizationOnboarding(data?: Partial<typeof mockOrganizationOnboarding>) {
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

  it("should create an organization with a non-existent user as owner", async () => {
    const organizationOnboarding = await createTestOrganizationOnboarding();

    const { organization, owner } = await createOrganizationFromOnboarding({
      organizationOnboarding,
      paymentSubscriptionId: "mock_subscription_id",
      paymentSubscriptionItemId: "mock_subscription_item_id",
    });

    // Verify organization creation
    expect(organization).toBeDefined();
    expect(organization.name).toBe(mockOrganizationOnboarding.name);
    expect(organization.slug).toBe(mockOrganizationOnboarding.slug);
    expect(organization.metadata).toEqual({
      orgSeats: 5,
      orgPricePerSeat: 20,
      billingPeriod: "MONTHLY",
      subscriptionId: "mock_subscription_id",
      subscriptionItemId: "mock_subscription_item_id",
    });

    // Verify owner creation
    expect(owner).toBeDefined();
    expect(owner.email).toBe(mockOrganizationOnboarding.orgOwnerEmail);

    // Verify inviteMembersWithNoInviterPermissionCheck was called
    expect(inviteMembersWithNoInviterPermissionCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: organization.id,
        invitations: mockOrganizationOnboarding.invitedMembers.map((member) => ({
          usernameOrEmail: member.email,
          role: MembershipRole.MEMBER,
        })),
      })
    );

    // Verify createTeamsHandler was called
    expect(createTeamsHandler).toHaveBeenCalledWith({
      ctx: expect.objectContaining({
        user: expect.objectContaining({
          ...owner,
          organizationId: organization.id,
        }),
      }),
      input: expect.objectContaining({
        teamNames: ["Team 2"],
        orgId: organization.id,
        moveTeams: [
          {
            id: 1,
            newSlug: "team-1",
            shouldMove: true,
          },
        ],
      }),
    });
  });

  it("should create an organization with an existing user as owner", async () => {
    const existingUser = await createTestUser({
      email: mockOrganizationOnboarding.orgOwnerEmail,
      name: "Existing User",
      username: "existinguser",
      onboardingCompleted: true,
      emailVerified: true,
    });

    const organizationOnboarding = await createTestOrganizationOnboarding();

    const { organization, owner } = await createOrganizationFromOnboarding({
      organizationOnboarding,
      paymentSubscriptionId: "mock_subscription_id",
      paymentSubscriptionItemId: "mock_subscription_item_id",
    });

    // Verify organization creation
    expect(organization).toBeDefined();
    expect(organization.name).toBe(mockOrganizationOnboarding.name);
    expect(organization.slug).toBe(mockOrganizationOnboarding.slug);

    // Verify owner is the existing user
    expect(owner.id).toBe(existingUser.id);
    expect(owner.email).toBe(existingUser.email);

    // Verify team creation and member invites still work
    expect(inviteMembersWithNoInviterPermissionCheck).toHaveBeenCalled();
    expect(createTeamsHandler).toHaveBeenCalled();
  });

  it("should reuse existing organization if organizationId is provided", async () => {
    const existingOrg = await createTestOrganization({
      name: mockOrganizationOnboarding.name,
      slug: mockOrganizationOnboarding.slug,
    });

    await createTestUser({
      email: mockOrganizationOnboarding.orgOwnerEmail,
      name: "Existing User",
      username: "existinguser",
      onboardingCompleted: true,
      emailVerified: true,
    });

    const organizationOnboarding = await createTestOrganizationOnboarding({
      organizationId: existingOrg.id,
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
      email: mockOrganizationOnboarding.orgOwnerEmail,
      name: "Existing User",
      username: "existinguser",
      onboardingCompleted: true,
      emailVerified: true,
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
    const existingUser = await createTestUser({
      email: mockOrganizationOnboarding.orgOwnerEmail,
      name: "Existing User",
      username: "existinguser",
      metadata: {},
      onboardingCompleted: true,
      emailVerified: true,
    });

    const organizationOnboarding = await createTestOrganizationOnboarding();

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
        stripeCustomerId: mockOrganizationOnboarding.stripeCustomerId,
      })
    );
  });
});
