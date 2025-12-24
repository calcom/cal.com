import prismock from "../../../../../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, vi, beforeEach } from "vitest";

import { LicenseKeySingleton } from "@calcom/ee/common/server/LicenseKeyService";
import { OrganizationOnboardingRepository } from "@calcom/features/organizations/repositories/OrganizationOnboardingRepository";
import * as constants from "@calcom/lib/constants";
import { UserPermissionRole, CreationSource, MembershipRole, BillingPeriod } from "@calcom/prisma/enums";
import { createTeamsHandler } from "@calcom/trpc/server/routers/viewer/organizations/createTeams.handler";
import { inviteMembersWithNoInviterPermissionCheck } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/inviteMember.handler";

import { SelfHostedOrganizationOnboardingService } from "../SelfHostedOnboardingService";
import type { CreateOnboardingIntentInput, OrganizationOnboardingData } from "../types";

vi.mock("../../OrganizationPaymentService");
vi.mock("@calcom/features/organizations/repositories/OrganizationOnboardingRepository");
vi.mock("@calcom/ee/common/server/LicenseKeyService", () => ({
  LicenseKeySingleton: {
    getInstance: vi.fn(),
  },
}));

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

const mockAdminUser = {
  id: 2,
  email: "admin@example.com",
  role: UserPermissionRole.ADMIN,
  name: "Admin User",
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

describe("SelfHostedOrganizationOnboardingService", () => {
  let service: SelfHostedOrganizationOnboardingService;
  let mockPaymentService: any;

  beforeEach(async () => {
    vi.resetAllMocks();
    // @ts-expect-error reset is a method on Prismock
    await prismock.reset();

    // Mock license check
    vi.mocked(LicenseKeySingleton.getInstance).mockResolvedValue({
      checkLicense: vi.fn().mockResolvedValue(true),
    } as any);

    mockPaymentService = {
      createOrganizationOnboarding: vi.fn().mockResolvedValue({
        id: "onboarding-123",
        name: mockInput.name,
        slug: mockInput.slug,
        orgOwnerEmail: mockInput.orgOwnerEmail,
        seats: mockInput.seats,
        pricePerSeat: mockInput.pricePerSeat,
        billingPeriod: "MONTHLY",
        isComplete: false,
        stripeCustomerId: null,
      }),
    };

    vi.mocked(OrganizationOnboardingRepository.update).mockResolvedValue({
      id: "onboarding-123",
      teams: [],
      invitedMembers: [],
    } as any);

    vi.mocked(OrganizationOnboardingRepository.markAsComplete).mockResolvedValue({} as any);

    service = new SelfHostedOrganizationOnboardingService(mockAdminUser as any, mockPaymentService);
  });

  describe("createOnboardingIntent", () => {
    it("should create onboarding record", async () => {
      await service.createOnboardingIntent(mockInput);

      expect(mockPaymentService.createOrganizationOnboarding).toHaveBeenCalledWith(
        expect.objectContaining({
          name: mockInput.name,
          slug: mockInput.slug,
          orgOwnerEmail: mockInput.orgOwnerEmail,
          createdByUserId: mockAdminUser.id,
        })
      );
    });

    it("should store teams and invites in onboarding record", async () => {
      await service.createOnboardingIntent(mockInput);

      // Teams and invites are now passed during creation, not via update
      expect(mockPaymentService.createOrganizationOnboarding).toHaveBeenCalledWith(
        expect.objectContaining({
          teams: expect.arrayContaining([
            { id: -1, name: "Engineering", isBeingMigrated: false, slug: null },
            { id: -1, name: "Sales", isBeingMigrated: false, slug: null },
          ]),
          invitedMembers: expect.arrayContaining([
            { email: "member1@example.com", name: "Member 1" },
            { email: "member2@example.com", name: "Member 2" },
          ]),
        })
      );
    });

    it("should mark onboarding as complete", async () => {
      await service.createOnboardingIntent(mockInput);

      expect(OrganizationOnboardingRepository.markAsComplete).toHaveBeenCalledWith("onboarding-123");
    });

    it("should return organization ID (not checkout URL)", async () => {
      const result = await service.createOnboardingIntent(mockInput);

      expect(result.organizationId).toBe(1);
      expect(result.checkoutUrl).toBeNull();
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

      // Teams are now passed during creation with empty names filtered out
      expect(mockPaymentService.createOrganizationOnboarding).toHaveBeenCalledWith(
        expect.objectContaining({
          teams: [{ id: -1, name: "Engineering", isBeingMigrated: false, slug: null }],
        })
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

      // Invites are now passed during creation with empty emails filtered out
      expect(mockPaymentService.createOrganizationOnboarding).toHaveBeenCalledWith(
        expect.objectContaining({
          invitedMembers: [{ email: "member1@example.com", name: "Member 1" }],
        })
      );
    });

    it("should create organization immediately", async () => {
      const result = await service.createOnboardingIntent(mockInput);

      // Organization created immediately, not pending payment
      expect(result.organizationId).toBe(1);
      expect(result.checkoutUrl).toBeNull();
    });

    it("should return all required fields", async () => {
      const result = await service.createOnboardingIntent(mockInput);

      expect(result).toEqual({
        userId: mockAdminUser.id,
        orgOwnerEmail: mockInput.orgOwnerEmail,
        name: mockInput.name,
        slug: mockInput.slug,
        seats: mockInput.seats,
        pricePerSeat: mockInput.pricePerSeat,
        billingPeriod: mockInput.billingPeriod,
        isPlatform: mockInput.isPlatform,
        organizationOnboardingId: "onboarding-123",
        checkoutUrl: null,
        organizationId: 1,
      });
    });
  });

  describe("createOrganization", () => {
    beforeEach(() => {
      vi.spyOn(constants, "IS_SELF_HOSTED", "get").mockReturnValue(true);
    });

    // Helper functions
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

    const mockOrganizationOnboarding: OrganizationOnboardingData = {
      id: "onboarding-123",
      organizationId: null,
      name: "Test Org",
      slug: "test-org",
      orgOwnerEmail: "test@example.com",
      billingPeriod: BillingPeriod.MONTHLY,
      seats: 5,
      pricePerSeat: 20,
      stripeCustomerId: null,
      invitedMembers: [{ email: "member1@example.com" }, { email: "member2@example.com" }],
      teams: [
        { id: 1, name: "Team To Move", isBeingMigrated: true, slug: "new-team-slug" },
        { id: 2, name: "New Team", isBeingMigrated: false, slug: null },
      ],
      logo: null,
      bio: null,
      brandColor: null,
      bannerUrl: null,
      isDomainConfigured: false,
      isPlatform: false,
    };

    it("should fail if the license is invalid", async () => {
      vi.mocked(LicenseKeySingleton.getInstance).mockResolvedValue({
        checkLicense: vi.fn().mockResolvedValue(false),
      } as any);

      await expect(service.createOrganization(mockOrganizationOnboarding)).rejects.toThrow(
        "Self hosted license not valid"
      );
    });

    it("should create an organization with a valid license", async () => {
      vi.mocked(LicenseKeySingleton.getInstance).mockResolvedValue({
        checkLicense: vi.fn().mockResolvedValue(true),
      } as any);

      const existingUser = await createTestUser({
        email: mockOrganizationOnboarding.orgOwnerEmail,
        name: "Existing User",
        username: "existinguser",
        onboardingCompleted: true,
        emailVerified: new Date(),
      });

      const { organization, owner } = await service.createOrganization(mockOrganizationOnboarding);

      expect(organization).toBeDefined();
      expect(organization.name).toBe(mockOrganizationOnboarding.name);
      expect(organization.slug).toBe(mockOrganizationOnboarding.slug);
      expect(owner).toBeDefined();
      expect(owner.id).toBe(existingUser.id);
    });

    it("should create organization with existing user as owner", async () => {
      vi.mocked(LicenseKeySingleton.getInstance).mockResolvedValue({
        checkLicense: vi.fn().mockResolvedValue(true),
      } as any);

      const existingUser = await createTestUser({
        email: mockOrganizationOnboarding.orgOwnerEmail,
        name: "Existing User",
        username: "existinguser",
        onboardingCompleted: true,
        emailVerified: new Date(),
      });

      const { organization, owner } = await service.createOrganization(mockOrganizationOnboarding);

      expect(organization).toBeDefined();
      expect(owner.id).toBe(existingUser.id);
      expect(owner.email).toBe(existingUser.email);

      // Verify teams and members
      expect(inviteMembersWithNoInviterPermissionCheck).toHaveBeenCalled();
      expect(createTeamsHandler).toHaveBeenCalled();
    });

    it("should throw error if organization with same slug exists", async () => {
      vi.mocked(LicenseKeySingleton.getInstance).mockResolvedValue({
        checkLicense: vi.fn().mockResolvedValue(true),
      } as any);

      await createTestUser({
        email: mockOrganizationOnboarding.orgOwnerEmail,
        onboardingCompleted: true,
        emailVerified: new Date(),
      });

      // Create existing organization with same slug
      await prismock.team.create({
        data: {
          name: "Conflicting Org",
          slug: mockOrganizationOnboarding.slug,
          isOrganization: true,
        },
      });

      await expect(service.createOrganization(mockOrganizationOnboarding)).rejects.toThrow(
        "organization_url_taken"
      );
    });

    it("should create organization with slug set even if there is a team with same slug owned by orgOwner", async () => {
      vi.mocked(LicenseKeySingleton.getInstance).mockResolvedValue({
        checkLicense: vi.fn().mockResolvedValue(true),
      } as any);

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

      const { organization } = await service.createOrganization(mockOrganizationOnboarding);

      expect(organization.slug).toBe(mockOrganizationOnboarding.slug);
    });

    it("should not create organization if there is a team with same slug not owned by orgOwner", async () => {
      vi.mocked(LicenseKeySingleton.getInstance).mockResolvedValue({
        checkLicense: vi.fn().mockResolvedValue(true),
      } as any);

      await createTestUser({
        email: mockOrganizationOnboarding.orgOwnerEmail,
        onboardingCompleted: true,
        emailVerified: new Date(),
      });

      await createTestTeam({
        name: "TestTeamWithConflictingSlugNotOwnedByOrgOwner",
        slug: mockOrganizationOnboarding.slug,
      });

      // Don't make the orgOwner a member of the team

      await expect(service.createOrganization(mockOrganizationOnboarding)).rejects.toThrow(
        "organization_url_taken"
      );
    });

    it("should invite members with isDirectUserAction set to false", async () => {
      vi.mocked(LicenseKeySingleton.getInstance).mockResolvedValue({
        checkLicense: vi.fn().mockResolvedValue(true),
      } as any);

      await createTestUser({
        email: mockOrganizationOnboarding.orgOwnerEmail,
        username: "org-owner",
        onboardingCompleted: true,
        emailVerified: new Date(),
      });

      const result = await service.createOrganization(mockOrganizationOnboarding);

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
      vi.mocked(LicenseKeySingleton.getInstance).mockResolvedValue({
        checkLicense: vi.fn().mockResolvedValue(true),
      } as any);

      await createTestUser({
        email: "owner@example.com",
        onboardingCompleted: true,
        emailVerified: new Date(),
      });

      const onboardingWithTeamInvites: OrganizationOnboardingData = {
        ...mockOrganizationOnboarding,
        orgOwnerEmail: "owner@example.com",
        teams: [
          { id: -1, name: "Marketing", isBeingMigrated: false, slug: null },
          { id: -1, name: "Engineering", isBeingMigrated: false, slug: null },
        ],
        invitedMembers: [
          { email: "marketer@example.com", teamName: "marketing", role: "MEMBER" },
          { email: "engineer@example.com", teamName: "engineering", role: "ADMIN" },
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

      const result = await service.createOrganization(onboardingWithTeamInvites);

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
    });
  });
});
