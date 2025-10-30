import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { prisma } from "@calcom/prisma";
import type { Team, User, Membership, Profile } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import inviteMemberHandler, { inviteMembersWithNoInviterPermissionCheck } from "./inviteMember.handler";

// Helper functions for database verification
async function verifyProfileExists(userId: number, organizationId: number): Promise<Profile | null> {
  return await prisma.profile.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  });
}

async function verifyMembershipExists(userId: number, teamId: number): Promise<Membership | null> {
  return await prisma.membership.findUnique({
    where: {
      userId_teamId: {
        userId,
        teamId,
      },
    },
  });
}



// Test data creation helpers with unique identifiers
function generateUniqueId() {
  return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

async function createTestUser(data: { email: string; username: string; name?: string }): Promise<User> {
  const uniqueId = generateUniqueId();
  const uniqueEmail = data.email.includes("@")
    ? data.email.replace("@", `-${uniqueId}@`)
    : `${data.email}-${uniqueId}@example.com`;
  const uniqueUsername = `${data.username}-${uniqueId}`;

  // Pre-emptive cleanup to avoid conflicts
  try {
    await prisma.user.deleteMany({
      where: { OR: [{ email: uniqueEmail }, { username: uniqueUsername }] },
    });
  } catch {
    // Ignore cleanup errors
  }

  return await prisma.user.create({
    data: {
      email: uniqueEmail,
      username: uniqueUsername,
      name: data.name || uniqueUsername,
    },
  });
}

async function createTestTeam(data: {
  name: string;
  slug: string;
  isOrganization?: boolean;
  parentId?: number;
  metadata?: Record<string, unknown>;
  organizationSettings?: {
    orgAutoAcceptEmail: string;
    isOrganizationVerified?: boolean;
  };
}): Promise<Team> {
  const uniqueId = generateUniqueId();
  const uniqueSlug = `${data.slug}-${uniqueId}`;

  // Pre-emptive cleanup to avoid conflicts
  try {
    await prisma.team.deleteMany({
      where: { slug: uniqueSlug },
    });
  } catch {
    // Ignore cleanup errors
  }

  const team = await prisma.team.create({
    data: {
      name: `${data.name} ${uniqueId}`,
      slug: uniqueSlug,
      isOrganization: data.isOrganization || false,
      parentId: data.parentId,
      metadata: data.metadata,
    },
  });

  // If this is an organization and organizationSettings are provided, create them
  if (data.isOrganization && data.organizationSettings) {
    await prisma.organizationSettings.create({
      data: {
        organizationId: team.id,
        orgAutoAcceptEmail: data.organizationSettings.orgAutoAcceptEmail,
        isOrganizationVerified: data.organizationSettings.isOrganizationVerified,
      },
    });
  }

  return team;
}

// Mock translations fetch
vi.mock("node-fetch", () => ({
  default: vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    })
  ),
}));

// Mock email sending
vi.mock("@calcom/emails", () => ({
  sendTeamInviteEmail: vi.fn(() => Promise.resolve()),
  sendOrganizationAutoJoinEmail: vi.fn(() => Promise.resolve()),
}));

// Mock for getTranslation
vi.mock("@calcom/lib/server/i18n", () => ({
  getTranslation: vi.fn(() => Promise.resolve((key: string) => key)),
}));

describe("inviteMember.handler Integration Tests", () => {
  // Track created test data for cleanup
  let testUsers: User[] = [];
  let testTeams: Team[] = [];

  beforeEach(async () => {
    // Reset tracking arrays
    testUsers = [];
    testTeams = [];
  });

  afterEach(async () => {
    // Clean up test data in reverse dependency order
    const userIds = testUsers.map((u) => u.id);
    const teamIds = testTeams.map((t) => t.id);

    if (userIds.length > 0 || teamIds.length > 0) {
      await prisma.$transaction([
        // Clean verification tokens for test users
        prisma.verificationToken.deleteMany({
          where: { identifier: { in: testUsers.map((u) => u.email) } },
        }),
        // Clean memberships
        prisma.membership.deleteMany({
          where: {
            OR: [{ userId: { in: userIds } }, { teamId: { in: teamIds } }],
          },
        }),
        // Clean profiles
        prisma.profile.deleteMany({
          where: {
            OR: [{ userId: { in: userIds } }, { organizationId: { in: teamIds } }],
          },
        }),
        // Clean teams
        prisma.team.deleteMany({
          where: { id: { in: teamIds } },
        }),
        // Clean users
        prisma.user.deleteMany({
          where: { id: { in: userIds } },
        }),
      ]);
    }
  });

  // Helper to track created entities
  function trackUser(user: User): User {
    testUsers.push(user);
    return user;
  }

  function trackTeam(team: Team): Team {
    testTeams.push(team);
    return team;
  }

  // Helper to create a proper user context for inviteMemberHandler
  function createUserContext(user: User, organizationId: number | null = null): NonNullable<TrpcSessionUser> {
    const baseUser = {
      id: user.id,
      email: user.email,
      username: user.username || "",
      name: user.name,
      emailVerified: user.emailVerified,
      avatarUrl: user.avatarUrl,
      avatar: `https://example.com/avatar.png`,
      locale: user.locale || "en",
      timeZone: user.timeZone || "UTC",
      role: user.role,
      allowDynamicBooking: user.allowDynamicBooking || true,
      completedOnboarding: user.completedOnboarding,
      twoFactorEnabled: user.twoFactorEnabled,
      identityProvider: user.identityProvider,
      brandColor: user.brandColor,
      darkBrandColor: user.darkBrandColor,
      theme: user.theme,
      createdDate: user.createdDate,
      disableImpersonation: user.disableImpersonation,
      movedToProfileId: user.movedToProfileId,
      organizationId,
      organization: organizationId
        ? {
            id: organizationId,
            isOrgAdmin: true,
            metadata: {},
            requestedSlug: null,
          }
        : {
            id: null,
            isOrgAdmin: false,
            metadata: {},
            requestedSlug: null,
          },
      defaultBookerLayouts: null,
      profile: organizationId
        ? {
            id: user.id,
            upId: `${user.username}-${organizationId}`,
            username: user.username || "",
            userId: user.id,
            organizationId,
            organization: {
              id: organizationId,
              name: "Test Organization",
              slug: "test-org",
              isOrganization: true,
              metadata: {},
            },
          }
        : {
            id: user.id,
            upId: `${user.username}-default`,
            username: user.username || "",
            userId: user.id,
            organizationId: null,
            organization: null,
          },
    };

    return baseUser as unknown as NonNullable<TrpcSessionUser>;
  }

  describe("Organization Direct Invite Flow", () => {
    it("should not auto-accept user's membership that was unaccepted when migrating to org with non-matching autoAcceptEmailDomain", async () => {
      const organization = trackTeam(
        await createTestTeam({
          name: "Test Organization",
          slug: "test-org",
          isOrganization: true,
          metadata: {},
          organizationSettings: {
            orgAutoAcceptEmail: "company.com",
            isOrganizationVerified: true,
          },
        })
      );

      const team = trackTeam(
        await createTestTeam({
          name: "Test Team",
          slug: "test-team",
          isOrganization: false,
          parentId: organization.id,
        })
      );

      const inviterUser = trackUser(
        await createTestUser({
          email: "inviter@company.com",
          username: "inviter",
        })
      );

      await prisma.membership.create({
        data: {
          userId: inviterUser.id,
          teamId: organization.id,
          role: MembershipRole.OWNER,
          accepted: true,
        },
      });

      // Act: Invite user with non-matching domain
      const nonMatchingUser = trackUser(
        await createTestUser({
          email: "external@other.com",
          username: "external",
        })
      );

      await prisma.membership.create({
        data: {
          userId: nonMatchingUser.id,
          teamId: team.id,
          role: MembershipRole.MEMBER,
          accepted: false,
        },
      });

      await inviteMemberHandler({
        ctx: {
          user: createUserContext(inviterUser, organization.id),
        },
        input: {
          teamId: organization.id,
          usernameOrEmail: nonMatchingUser.email,
          role: MembershipRole.MEMBER,
          language: "en",
          creationSource: "WEBAPP" as const,
        },
      });

      // Assert: No profile should be created
      const profile = await verifyProfileExists(nonMatchingUser.id, organization.id);
      expect(profile).toBeFalsy();

      // Membership should not be auto-accepted
      const membership = await verifyMembershipExists(nonMatchingUser.id, organization.id);
      expect(membership).toBeTruthy();
      expect(membership?.accepted).toBe(false);

      // Verify that the user is not a member of the organization
      const nonMatchingUserMembershipWithTeam = await verifyMembershipExists(nonMatchingUser.id, team.id);
      expect(nonMatchingUserMembershipWithTeam).toBeTruthy();
      expect(nonMatchingUserMembershipWithTeam?.accepted).toBe(false);
    });

    it("should auto-accept user's membership that was unaccepted when migrating to org with matching autoAcceptEmailDomain", async () => {
      // Setup: User with unverified email who has an unaccepted team membership
      const unverifiedUserWithUnacceptedMembership = trackUser(
        await createTestUser({
          email: "john.doe@acme.com",
          username: "john.doe",
        })
      );

      // Add unverified email status - will need to update in DB
      await prisma.user.update({
        where: { id: unverifiedUserWithUnacceptedMembership.id },
        data: { emailVerified: null },
      });

      const organization = trackTeam(
        await createTestTeam({
          name: "Acme",
          slug: "acme",
          isOrganization: true,
          metadata: {},
          organizationSettings: {
            orgAutoAcceptEmail: "acme.com", // Matches user's email domain
            isOrganizationVerified: true,
          },
        })
      );

      // Create a regular team first where user has unaccepted membership
      const regularTeam = trackTeam(
        await createTestTeam({
          name: "Regular Team",
          slug: "regular-team",
          isOrganization: false,
          parentId: organization.id,
        })
      );

      // Add unaccepted team membership
      await prisma.membership.create({
        data: {
          teamId: regularTeam.id,
          userId: unverifiedUserWithUnacceptedMembership.id,
          accepted: false, // KEY: Unaccepted membership
          role: MembershipRole.MEMBER,
        },
      });

      // Act: Simulate migration by inviting the user to the organization
      await inviteMembersWithNoInviterPermissionCheck({
        inviterName: null,
        teamId: organization.id,
        language: "en",
        creationSource: "WEBAPP" as const,
        orgSlug: organization.slug,
        invitations: [
          {
            usernameOrEmail: unverifiedUserWithUnacceptedMembership.email,
            role: MembershipRole.MEMBER,
          },
        ],
      });

      await verifyMembershipExists(
        unverifiedUserWithUnacceptedMembership.id,
        organization.id
      );
      const profile = await verifyProfileExists(unverifiedUserWithUnacceptedMembership.id, organization.id);

      expect(profile?.userId).toBe(unverifiedUserWithUnacceptedMembership.id);
      expect(profile?.organizationId).toBe(organization.id);

      // Verify original team membership is accepted now
      const originalMembership = await verifyMembershipExists(
        unverifiedUserWithUnacceptedMembership.id,
        regularTeam.id
      );
      expect(originalMembership?.accepted).toBe(true);
    });
  });

  describe("Subteam Direct Invite Flow", () => {
    it("should immediately add auto-accepted new users to event types with assignAllTeamMembers=true", async () => {
      // Setup: Create organization and team
      const organization = trackTeam(
        await createTestTeam({
          name: "Test Organization",
          slug: "test-org",
          isOrganization: true,
          metadata: {},
          organizationSettings: {
            orgAutoAcceptEmail: "company.com",
            isOrganizationVerified: true,
          },
        })
      );

      const team = trackTeam(
        await createTestTeam({
          name: "Sales Team",
          slug: "sales-team",
          isOrganization: false,
          parentId: organization.id,
        })
      );

      // Create inviter user
      const inviterUser = trackUser(
        await createTestUser({
          email: "inviter@company.com",
          username: "inviter",
        })
      );

      await prisma.membership.create({
        data: {
          userId: inviterUser.id,
          teamId: organization.id,
          role: MembershipRole.OWNER,
          accepted: true,
        },
      });

      await prisma.membership.create({
        data: {
          userId: inviterUser.id,
          teamId: team.id,
          role: MembershipRole.OWNER,
          accepted: true,
        },
      });

      // Create event type with assignAllTeamMembers enabled
      const eventType = await prisma.eventType.create({
        data: {
          title: "Team Event",
          slug: "team-event",
          length: 30,
          teamId: team.id,
          assignAllTeamMembers: true,
        },
      });

      // Act: Invite a new user (non-existing) with auto-accept domain
      const newUserEmail = `newuser-${generateUniqueId()}@company.com`;

      await inviteMembersWithNoInviterPermissionCheck({
        inviterName: inviterUser.name,
        teamId: team.id,
        language: "en",
        creationSource: "WEBAPP" as const,
        orgSlug: organization.slug,
        invitations: [
          {
            usernameOrEmail: newUserEmail,
            role: MembershipRole.MEMBER,
          },
        ],
      });

      // Assert: Verify user was created
      const createdUser = await prisma.user.findUnique({
        where: { email: newUserEmail },
      });
      expect(createdUser).toBeTruthy();
      
      if (createdUser) {
        trackUser(createdUser);

        // Verify membership is auto-accepted
        const membership = await verifyMembershipExists(createdUser.id, team.id);
        expect(membership).toBeTruthy();
        expect(membership?.accepted).toBe(true);

        // Verify user is immediately added as host to the event type
        const host = await prisma.host.findFirst({
          where: {
            userId: createdUser.id,
            eventTypeId: eventType.id,
          },
        });

        expect(host).toBeTruthy();
        expect(host?.userId).toBe(createdUser.id);
        expect(host?.eventTypeId).toBe(eventType.id);
      }

      // Cleanup event type
      await prisma.eventType.delete({ where: { id: eventType.id } });
    });
  });
});
