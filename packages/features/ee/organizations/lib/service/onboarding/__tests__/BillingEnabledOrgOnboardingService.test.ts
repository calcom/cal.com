import prismock from "../../../../../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, vi, beforeEach } from "vitest";

import * as constants from "@calcom/lib/constants";
import { createDomain } from "@calcom/lib/domainManager/organization";
import { UserPermissionRole, CreationSource, MembershipRole, BillingPeriod } from "@calcom/prisma/enums";
import { createTeamsHandler } from "@calcom/trpc/server/routers/viewer/organizations/createTeams.handler";
import { inviteMembersWithNoInviterPermissionCheck } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/inviteMember.handler";

import type { CreateOnboardingIntentInput } from "../../onboarding/types";
import { BillingEnabledOrgOnboardingService } from "../BillingEnabledOrgOnboardingService";

vi.mock("../../OrganizationPaymentService");

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

vi.mock("@calcom/lib/server/i18n", () => {
  return {
    getTranslation: async (locale: string, namespace: string) => {
      const t = (key: string) => key;
      t.locale = locale;
      t.namespace = namespace;
      return t;
    },
  };
});

const mockUser = {
  id: 1,
  email: "user@example.com",
  role: UserPermissionRole.USER,
  name: "Test User",
};

const mockInput: CreateOnboardingIntentInput = {
  name: "Test Organization",
  slug: "test-org",
  orgOwnerEmail: "owner@example.com",
  seats: 10,
  pricePerSeat: 20,
  isPlatform: false,
  creationSource: CreationSource.WEBAPP,
  logo: "https://example.com/logo.png",
  bio: "Test bio",
  brandColor: "#000000",
  bannerUrl: "https://example.com/banner.png",
  teams: [
    { id: -1, name: "Engineering", isBeingMigrated: false, slug: null },
    { id: -1, name: "Sales", isBeingMigrated: false, slug: null },
  ],
  invitedMembers: [
    { email: "member1@example.com", name: "Member 1" },
    { email: "member2@example.com", name: "Member 2" },
  ],
};

describe("BillingEnabledOrgOnboardingService", () => {
  let service: BillingEnabledOrgOnboardingService;
  let mockPaymentService: any;

  beforeEach(async () => {
    vi.resetAllMocks();
    // @ts-expect-error reset is a method on Prismock
    await prismock.reset();

    mockPaymentService = {
      createOrganizationOnboarding: vi.fn().mockImplementation(async (data: any) => {
        // Actually create the record in prismock so it can be updated later
        return await prismock.organizationOnboarding.create({
          data: {
            id: "onboarding-123",
            name: data.name,
            slug: data.slug,
            orgOwnerEmail: data.orgOwnerEmail,
            seats: data.seats ?? null,
            pricePerSeat: data.pricePerSeat ?? null,
            billingPeriod: data.billingPeriod ?? BillingPeriod.MONTHLY,
            isComplete: false,
            stripeCustomerId: null,
            createdById: data.createdByUserId,
            teams: [],
            invitedMembers: [],
            isPlatform: data.isPlatform ?? false,
            logo: data.logo ?? null,
            bio: data.bio ?? null,
            brandColor: data.brandColor ?? null,
            bannerUrl: data.bannerUrl ?? null,
          },
        });
      }),
      createPaymentIntent: vi.fn().mockResolvedValue({
        checkoutUrl: "https://stripe.com/checkout/session",
        organizationOnboarding: {},
        subscription: {},
        sessionId: "session-123",
      }),
    };

    service = new BillingEnabledOrgOnboardingService(mockUser as any, mockPaymentService);
  });

  describe("createOnboardingIntent", () => {
    it("should create onboarding record", async () => {
      await service.createOnboardingIntent(mockInput);

      expect(mockPaymentService.createOrganizationOnboarding).toHaveBeenCalledWith(
        expect.objectContaining({
          name: mockInput.name,
          slug: mockInput.slug,
          orgOwnerEmail: mockInput.orgOwnerEmail,
          createdByUserId: mockUser.id,
        })
      );
    });

    it("should create Stripe payment intent with teams and invites", async () => {
      await service.createOnboardingIntent(mockInput);

      expect(mockPaymentService.createPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          teams: expect.arrayContaining([
            { id: -1, name: "Engineering", isBeingMigrated: false, slug: null },
            { id: -1, name: "Sales", isBeingMigrated: false, slug: null },
          ]),
          invitedMembers: expect.arrayContaining([
            { email: "member1@example.com", name: "Member 1" },
            { email: "member2@example.com", name: "Member 2" },
          ]),
        }),
        expect.anything()
      );
    });

    it("should return checkout URL", async () => {
      const result = await service.createOnboardingIntent(mockInput);

      expect(result.checkoutUrl).toBe("https://stripe.com/checkout/session");
      expect(result.organizationId).toBeNull();
    });

    it("should filter out empty team names", async () => {
      const inputWithEmptyTeams = {
        ...mockInput,
        teams: [
          { id: -1, name: "Engineering", isBeingMigrated: false, slug: null },
          { id: -1, name: "  ", isBeingMigrated: false, slug: null },
          { id: -1, name: "", isBeingMigrated: false, slug: null },
        ],
      };

      await service.createOnboardingIntent(inputWithEmptyTeams);

      expect(mockPaymentService.createPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          teams: [{ id: -1, name: "Engineering", isBeingMigrated: false, slug: null }],
        }),
        expect.anything()
      );
    });

    it("should filter out empty invite emails", async () => {
      const inputWithEmptyInvites = {
        ...mockInput,
        invitedMembers: [
          { email: "member1@example.com", name: "Member 1" },
          { email: "  ", name: "Empty" },
          { email: "", name: "Empty 2" },
        ],
      };

      await service.createOnboardingIntent(inputWithEmptyInvites);

      expect(mockPaymentService.createPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          invitedMembers: [{ email: "member1@example.com", name: "Member 1" }],
        }),
        expect.anything()
      );
    });

    it("should NOT create organization immediately", async () => {
      const result = await service.createOnboardingIntent(mockInput);

      // Organization will be created later via Stripe webhook
      expect(result.organizationId).toBeNull();
      expect(result.checkoutUrl).not.toBeNull();
    });

    it("should return all required fields", async () => {
      const result = await service.createOnboardingIntent(mockInput);

      expect(result).toEqual({
        userId: mockUser.id,
        orgOwnerEmail: mockInput.orgOwnerEmail,
        name: mockInput.name,
        slug: mockInput.slug,
        seats: mockInput.seats,
        pricePerSeat: mockInput.pricePerSeat,
        billingPeriod: mockInput.billingPeriod,
        isPlatform: mockInput.isPlatform,
        organizationOnboardingId: "onboarding-123",
        checkoutUrl: "https://stripe.com/checkout/session",
        organizationId: null,
      });
    });

    it("should immediately create organization when admin creates org for self", async () => {
      vi.spyOn(constants, "IS_SELF_HOSTED", "get").mockReturnValue(false);

      const adminUser = {
        id: 1,
        email: "admin@example.com",
        role: UserPermissionRole.ADMIN,
        name: "Admin User",
      };

      const adminInput = {
        ...mockInput,
        orgOwnerEmail: adminUser.email,
      };

      await prismock.user.create({
        data: {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          username: "admin",
          completedOnboarding: true,
          emailVerified: new Date(),
        },
      });

      const adminService = new BillingEnabledOrgOnboardingService(adminUser as any, mockPaymentService);

      const result = await adminService.createOnboardingIntent(adminInput);

      expect(result.organizationId).not.toBeNull();
      expect(result.checkoutUrl).toBeNull();
      expect(mockPaymentService.createPaymentIntent).not.toHaveBeenCalled();

      const onboarding = await prismock.organizationOnboarding.findUnique({
        where: { id: result.organizationOnboardingId },
      });
      expect(onboarding?.isComplete).toBe(true);
    });

    it("should use checkout flow when admin creates org for someone else with no teams/invites (handover)", async () => {
      const adminUser = {
        id: 1,
        email: "admin@example.com",
        role: UserPermissionRole.ADMIN,
        name: "Admin User",
      };

      const handoverInput = {
        ...mockInput,
        orgOwnerEmail: "other@example.com",
        teams: [],
        invitedMembers: [],
      };

      const adminService = new BillingEnabledOrgOnboardingService(adminUser as any, mockPaymentService);

      const result = await adminService.createOnboardingIntent(handoverInput);

      expect(result.organizationId).toBeNull();
      expect(result.checkoutUrl).toBeNull();
      expect(result.handoverUrl).toContain("/settings/organizations/new/resume");
      expect(mockPaymentService.createPaymentIntent).not.toHaveBeenCalled();
    });
  });

  describe("createOrganization", () => {
    // Helper functions for creating test data
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

    async function createTestOnboarding(overrides?: Partial<typeof mockOrganizationOnboardingData>) {
      return await prismock.organizationOnboarding.create({
        data: {
          ...mockOrganizationOnboardingData,
          ...overrides,
        },
      });
    }

    const mockOrganizationOnboardingData = {
      id: "onboarding-123",
      organizationId: null,
      name: "Test Org",
      slug: "test-org",
      orgOwnerEmail: "owner@example.com",
      seats: 5,
      pricePerSeat: 20,
      billingPeriod: BillingPeriod.MONTHLY,
      invitedMembers: [{ email: "member1@example.com" }, { email: "member2@example.com" }],
      teams: [
        { id: 1, name: "Team To Move", isBeingMigrated: true, slug: "new-team-slug" },
        { id: -1, name: "New Team", isBeingMigrated: false, slug: null },
      ],
      isPlatform: false,
      logo: null,
      bio: null,
      brandColor: null,
      bannerUrl: null,
      stripeCustomerId: "cus_123",
      isDomainConfigured: false,
      isComplete: false,
      createdById: null,
    };

    it("should require payment details for billing-enabled flow", async () => {
      vi.spyOn(constants, "IS_SELF_HOSTED", "get").mockReturnValue(false);

      const mockOrganizationOnboarding = await createTestOnboarding();

      await expect(service.createOrganization(mockOrganizationOnboarding)).rejects.toThrow(
        "payment_subscription_id_and_payment_subscription_item_id_are_required"
      );
    });

    it("should create organization with existing user as owner", async () => {
      vi.spyOn(constants, "IS_SELF_HOSTED", "get").mockReturnValue(false);

      const mockOrganizationOnboarding = await createTestOnboarding();

      const existingUser = await createTestUser({
        email: mockOrganizationOnboarding.orgOwnerEmail,
        name: "Existing User",
        username: "existinguser",
        onboardingCompleted: true,
        emailVerified: new Date(),
      });

      const { organization, owner } = await service.createOrganization(mockOrganizationOnboarding, {
        subscriptionId: "sub_123",
        subscriptionItemId: "si_123",
      });

      // Verify organization creation
      expect(organization).toBeDefined();
      expect(organization.name).toBe(mockOrganizationOnboarding.name);
      expect(organization.slug).toBe(mockOrganizationOnboarding.slug);

      // Verify owner is the existing user
      expect(owner.id).toBe(existingUser.id);
      expect(owner.email).toBe(existingUser.email);

      expect(createDomain).toHaveBeenCalledWith(organization.slug);
      expect(inviteMembersWithNoInviterPermissionCheck).toHaveBeenCalled();
      expect(createTeamsHandler).toHaveBeenCalled();
    });

    it("should reuse existing organization if organizationId is already set (idempotency)", async () => {
      vi.spyOn(constants, "IS_SELF_HOSTED", "get").mockReturnValue(false);

      const mockOrganizationOnboarding = await createTestOnboarding();

      const existingOrg = await createTestOrganization({
        name: mockOrganizationOnboarding.name,
        slug: mockOrganizationOnboarding.slug,
      });

      const existingUser = await createTestUser({
        email: mockOrganizationOnboarding.orgOwnerEmail,
        onboardingCompleted: true,
        emailVerified: new Date(),
      });

      const onboardingWithOrgId = {
        ...mockOrganizationOnboarding,
        organizationId: existingOrg.id,
      };

      const { organization } = await service.createOrganization(onboardingWithOrgId, {
        subscriptionId: "sub_123",
        subscriptionItemId: "si_123",
      });

      // Verify the existing organization was reused
      expect(organization.id).toBe(existingOrg.id);
    });

    it("should throw error if organization with same slug exists", async () => {
      vi.spyOn(constants, "IS_SELF_HOSTED", "get").mockReturnValue(false);

      const mockOrganizationOnboarding = await createTestOnboarding();

      await createTestUser({
        email: mockOrganizationOnboarding.orgOwnerEmail,
        onboardingCompleted: true,
        emailVerified: new Date(),
      });

      await createTestOrganization({
        name: "Conflicting Org",
        slug: mockOrganizationOnboarding.slug,
      });

      await expect(
        service.createOrganization(mockOrganizationOnboarding, {
          subscriptionId: "sub_123",
          subscriptionItemId: "si_123",
        })
      ).rejects.toThrow("organization_url_taken");
    });

    it("should update stripe customer ID for existing user", async () => {
      vi.spyOn(constants, "IS_SELF_HOSTED", "get").mockReturnValue(false);

      const mockOrganizationOnboarding = await createTestOnboarding();

      const existingUser = await createTestUser({
        email: mockOrganizationOnboarding.orgOwnerEmail,
        onboardingCompleted: true,
        emailVerified: new Date(),
      });

      await service.createOrganization(mockOrganizationOnboarding, {
        subscriptionId: "sub_123",
        subscriptionItemId: "si_123",
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

    it("should create organization even if there is a team with same slug that orgOwner is a member of", async () => {
      vi.spyOn(constants, "IS_SELF_HOSTED", "get").mockReturnValue(false);

      const mockOrganizationOnboarding = await createTestOnboarding();

      const existingUser = await createTestUser({
        email: mockOrganizationOnboarding.orgOwnerEmail,
        onboardingCompleted: true,
        emailVerified: new Date(),
      });

      const teamWithConflictingSlug = await createTestTeam({
        name: "TestTeamWithConflictingSlug",
        slug: mockOrganizationOnboarding.slug,
      });

      // Make the orgOwner a member of the team
      await createTestMembership({
        userId: existingUser.id,
        teamId: teamWithConflictingSlug.id,
        role: MembershipRole.ADMIN,
      });

      const { organization } = await service.createOrganization(mockOrganizationOnboarding, {
        subscriptionId: "sub_123",
        subscriptionItemId: "si_123",
      });

      expect(organization.slug).toBe(mockOrganizationOnboarding.slug);
    });

    it("should not create organization if there is a team with same slug that orgOwner is NOT a member of", async () => {
      vi.spyOn(constants, "IS_SELF_HOSTED", "get").mockReturnValue(false);

      const mockOrganizationOnboarding = await createTestOnboarding();

      await createTestUser({
        email: mockOrganizationOnboarding.orgOwnerEmail,
        onboardingCompleted: true,
        emailVerified: new Date(),
      });

      await createTestTeam({
        name: "TestTeamWithConflictingSlugNotOwnedByOrgOwner",
        slug: mockOrganizationOnboarding.slug,
      });

      await expect(
        service.createOrganization(mockOrganizationOnboarding, {
          subscriptionId: "sub_123",
          subscriptionItemId: "si_123",
        })
      ).rejects.toThrow("organization_url_taken");
    });

    it("should invite members with isDirectUserAction set to false", async () => {
      vi.spyOn(constants, "IS_SELF_HOSTED", "get").mockReturnValue(false);

      const mockOrganizationOnboarding = await createTestOnboarding();

      await createTestUser({
        email: mockOrganizationOnboarding.orgOwnerEmail,
        username: "org-owner",
        onboardingCompleted: true,
        emailVerified: new Date(),
      });

      const result = await service.createOrganization(mockOrganizationOnboarding, {
        subscriptionId: "sub_123",
        subscriptionItemId: "si_123",
      });

      // Verify inviteMembersWithNoInviterPermissionCheck was called with isDirectUserAction: false
      expect(inviteMembersWithNoInviterPermissionCheck).toHaveBeenCalledWith(
        expect.objectContaining({
          teamId: result.organization.id,
          invitations: [
            { usernameOrEmail: "member1@example.com", role: MembershipRole.MEMBER },
            { usernameOrEmail: "member2@example.com", role: MembershipRole.MEMBER },
          ],
          isDirectUserAction: false,
        })
      );
    });

    it("should invite members to specific teams based on teamName", async () => {
      vi.spyOn(constants, "IS_SELF_HOSTED", "get").mockReturnValue(false);

      const mockOrganizationOnboarding = await createTestOnboarding();

      await createTestUser({
        email: mockOrganizationOnboarding.orgOwnerEmail,
        onboardingCompleted: true,
        emailVerified: new Date(),
      });

      const onboardingWithTeamInvites = {
        ...mockOrganizationOnboarding,
        teams: [
          { id: -1, name: "Marketing", isBeingMigrated: false, slug: null },
          { id: -1, name: "Engineering", isBeingMigrated: false, slug: null },
        ],
        invitedMembers: [
          { email: "marketer@example.com", teamName: "marketing", role: MembershipRole.MEMBER },
          { email: "engineer@example.com", teamName: "engineering", role: MembershipRole.ADMIN },
          { email: "orguser@example.com" },
        ],
      };

      // Setup: createTeamsHandler will be called and we need teams to exist for inviteMembers
      vi.mocked(createTeamsHandler).mockImplementation(async (options) => {
        const marketing = await prismock.team.create({
          data: {
            name: "Marketing",
            slug: "marketing",
            parentId: options.input.orgId,
          },
        });
        const engineering = await prismock.team.create({
          data: {
            name: "Engineering",
            slug: "engineering",
            parentId: options.input.orgId,
          },
        });
        return { teams: [marketing, engineering] } as any;
      });

      const result = await service.createOrganization(onboardingWithTeamInvites, {
        subscriptionId: "sub_123",
        subscriptionItemId: "si_123",
      });

      // Verify invites were sent to 3 different targets (org + 2 teams)
      expect(inviteMembersWithNoInviterPermissionCheck).toHaveBeenCalledTimes(3);

      // Check org-level invite
      const orgInviteCall = vi
        .mocked(inviteMembersWithNoInviterPermissionCheck)
        .mock.calls.find((call) => call[0].teamId === result.organization.id);
      expect(orgInviteCall).toBeDefined();
      expect(orgInviteCall![0].invitations).toEqual([
        { usernameOrEmail: "orguser@example.com", role: MembershipRole.MEMBER },
      ]);

      // Check Marketing team invite
      const teams = await prismock.team.findMany({ where: { parentId: result.organization.id } });
      const marketingTeam = teams.find((t) => t.name === "Marketing");
      const marketingInviteCall = vi
        .mocked(inviteMembersWithNoInviterPermissionCheck)
        .mock.calls.find((call) => call[0].teamId === marketingTeam!.id);
      expect(marketingInviteCall).toBeDefined();
      expect(marketingInviteCall![0].invitations).toEqual([
        { usernameOrEmail: "marketer@example.com", role: MembershipRole.MEMBER },
      ]);

      // Check Engineering team invite
      const engineeringTeam = teams.find((t) => t.name === "Engineering");
      const engineeringInviteCall = vi
        .mocked(inviteMembersWithNoInviterPermissionCheck)
        .mock.calls.find((call) => call[0].teamId === engineeringTeam!.id);
      expect(engineeringInviteCall).toBeDefined();
      expect(engineeringInviteCall![0].invitations).toEqual([
        { usernameOrEmail: "engineer@example.com", role: MembershipRole.ADMIN },
      ]);
    });

    it("should preserve custom roles for invited members", async () => {
      vi.spyOn(constants, "IS_SELF_HOSTED", "get").mockReturnValue(false);

      const mockOrganizationOnboarding = await createTestOnboarding();

      await createTestUser({
        email: mockOrganizationOnboarding.orgOwnerEmail,
        onboardingCompleted: true,
        emailVerified: new Date(),
      });

      const onboardingWithRoles = {
        ...mockOrganizationOnboarding,
        invitedMembers: [
          { email: "admin@example.com", role: MembershipRole.ADMIN },
          { email: "member@example.com", role: MembershipRole.MEMBER },
        ],
      };

      const result = await service.createOrganization(onboardingWithRoles, {
        subscriptionId: "sub_123",
        subscriptionItemId: "si_123",
      });

      const inviteCall = vi
        .mocked(inviteMembersWithNoInviterPermissionCheck)
        .mock.calls.find((call) => call[0].teamId === result.organization.id);

      expect(inviteCall).toBeDefined();
      expect(inviteCall![0].invitations).toEqual([
        { usernameOrEmail: "admin@example.com", role: MembershipRole.ADMIN },
        { usernameOrEmail: "member@example.com", role: MembershipRole.MEMBER },
      ]);
    });

    it("should handle mixed org-level and team-specific invites", async () => {
      vi.spyOn(constants, "IS_SELF_HOSTED", "get").mockReturnValue(false);

      const mockOrganizationOnboarding = await createTestOnboarding();

      await createTestUser({
        email: mockOrganizationOnboarding.orgOwnerEmail,
        onboardingCompleted: true,
        emailVerified: new Date(),
      });

      const onboardingWithMixedInvites = {
        ...mockOrganizationOnboarding,
        teams: [{ id: -1, name: "Sales", isBeingMigrated: false, slug: null }],
        invitedMembers: [
          { email: "sales1@example.com", teamName: "sales", role: MembershipRole.MEMBER },
          { email: "sales2@example.com", teamName: "sales", role: MembershipRole.ADMIN },
          { email: "org1@example.com", role: MembershipRole.MEMBER },
          { email: "org2@example.com", role: MembershipRole.MEMBER },
        ],
      };

      vi.mocked(createTeamsHandler).mockImplementation(async (options) => {
        const salesTeam = await prismock.team.create({
          data: {
            name: "Sales",
            slug: "sales",
            parentId: options.input.orgId,
          },
        });
        return { teams: [salesTeam] } as any;
      });

      const result = await service.createOrganization(onboardingWithMixedInvites, {
        subscriptionId: "sub_123",
        subscriptionItemId: "si_123",
      });

      expect(inviteMembersWithNoInviterPermissionCheck).toHaveBeenCalledTimes(2);

      // Find org-level invites
      const orgInviteCall = vi
        .mocked(inviteMembersWithNoInviterPermissionCheck)
        .mock.calls.find((call) => call[0].teamId === result.organization.id);

      expect(orgInviteCall).toBeDefined();
      expect(orgInviteCall![0].invitations).toEqual([
        { usernameOrEmail: "org1@example.com", role: MembershipRole.MEMBER },
        { usernameOrEmail: "org2@example.com", role: MembershipRole.MEMBER },
      ]);

      // Find Sales team invites
      const teams = await prismock.team.findMany({ where: { parentId: result.organization.id } });
      const salesTeam = teams.find((t) => t.name === "Sales");
      const salesInviteCall = vi
        .mocked(inviteMembersWithNoInviterPermissionCheck)
        .mock.calls.find((call) => call[0].teamId === salesTeam!.id);

      expect(salesInviteCall).toBeDefined();
      expect(salesInviteCall![0].invitations).toEqual([
        { usernameOrEmail: "sales1@example.com", role: MembershipRole.MEMBER },
        { usernameOrEmail: "sales2@example.com", role: MembershipRole.ADMIN },
      ]);
    });

    it("should fall back to org-level invite if teamName does not match any created team", async () => {
      vi.spyOn(constants, "IS_SELF_HOSTED", "get").mockReturnValue(false);

      const mockOrganizationOnboarding = await createTestOnboarding();

      await createTestUser({
        email: mockOrganizationOnboarding.orgOwnerEmail,
        onboardingCompleted: true,
        emailVerified: new Date(),
      });

      const onboardingWithNonMatchingTeam = {
        ...mockOrganizationOnboarding,
        teams: [{ id: -1, name: "Marketing", isBeingMigrated: false, slug: null }],
        invitedMembers: [
          { email: "user@example.com", teamName: "NonExistentTeam", role: MembershipRole.MEMBER },
        ],
      };

      vi.mocked(createTeamsHandler).mockResolvedValue({
        teams: [{ id: 300, name: "Marketing" }],
      } as any);

      const result = await service.createOrganization(onboardingWithNonMatchingTeam, {
        subscriptionId: "sub_123",
        subscriptionItemId: "si_123",
      });

      expect(inviteMembersWithNoInviterPermissionCheck).toHaveBeenCalledWith(
        expect.objectContaining({
          teamId: result.organization.id,
          invitations: [{ usernameOrEmail: "user@example.com", role: MembershipRole.MEMBER }],
          isDirectUserAction: false,
        })
      );
    });
  });
});
