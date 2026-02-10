import { SeatChangeTrackingService } from "@calcom/features/ee/billing/service/seatTracking/SeatChangeTrackingService";
import { getParsedTeam } from "@calcom/features/ee/teams/lib/getParsedTeam";
import {
  createMemberships,
  getTeamOrThrow,
  sendEmails,
  sendExistingUserTeamInviteEmails,
  sendSignupToOrganizationEmail,
  type UserWithMembership,
} from "@calcom/features/ee/teams/lib/inviteMemberUtils";
import { updateNewTeamMemberEventTypes } from "@calcom/features/ee/teams/lib/queries";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { createAProfileForAnExistingUser } from "@calcom/features/profile/lib/createAProfileForAnExistingUser";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";
import { ENABLE_PROFILE_SWITCHER } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import slugify from "@calcom/lib/slugify";
import { prisma } from "@calcom/prisma";
import type { OrganizationSettings, Team } from "@calcom/prisma/client";
import type { CreationSource } from "@calcom/prisma/enums";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import { isEmail } from "../util";
import type { TeamWithParent } from "./types";

export type { Invitee, UserWithMembership } from "@calcom/features/ee/teams/lib/inviteMemberUtils";
export {
  createMemberships,
  getTeamOrThrow,
  sendEmails,
  sendExistingUserTeamInviteEmails,
  sendSignupToOrganizationEmail,
} from "@calcom/features/ee/teams/lib/inviteMemberUtils";

const log = logger.getSubLogger({ prefix: ["inviteMember.utils"] });

export type Invitation = {
  usernameOrEmail: string;
  role: MembershipRole;
};

type InvitableExistingUser = UserWithMembership & {
  newRole: MembershipRole;
};

type InvitableExistingUserWithProfile = InvitableExistingUser & {
  profile: {
    username: string;
  } | null;
};

export async function ensureAtleastAdminPermissions({
  userId,
  teamId,
  isOrg,
}: {
  userId: number;
  teamId: number;
  isOrg?: boolean;
}) {
  const permissionCheckService = new PermissionCheckService();

  // Checks if the team they are inviting to IS the org. Not a child team
  // TODO: do some logic here to check if the user is inviting a NEW user to a team that ISNT in the same org
  const permission = isOrg ? "organization.invite" : "team.invite";
  const hasInvitePermission = await permissionCheckService.checkPermission({
    userId,
    teamId,
    permission,
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

  if (!hasInvitePermission) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
}

export function checkInputEmailIsValid(email: string) {
  if (!isEmail(email))
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invite failed because ${email} is not a valid email address`,
    });
}

export async function getUniqueInvitationsOrThrowIfEmpty(invitations: Invitation[]) {
  const usernamesOrEmailsSet = new Set<string>();
  const uniqueInvitations: Invitation[] = [];

  invitations.forEach((usernameOrEmail) => {
    if (usernamesOrEmailsSet.has(usernameOrEmail.usernameOrEmail)) {
      return;
    }
    uniqueInvitations.push(usernameOrEmail);
    usernamesOrEmailsSet.add(usernameOrEmail.usernameOrEmail);
  });

  if (uniqueInvitations.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You must provide at least one email address to invite.",
    });
  }

  return uniqueInvitations;
}

export enum INVITE_STATUS {
  USER_PENDING_MEMBER_OF_THE_ORG = "USER_PENDING_MEMBER_OF_THE_ORG",
  USER_ALREADY_INVITED_OR_MEMBER = "USER_ALREADY_INVITED_OR_MEMBER",
  USER_MEMBER_OF_OTHER_ORGANIZATION = "USER_MEMBER_OF_OTHER_ORGANIZATION",
  CAN_BE_INVITED = "CAN_BE_INVITED",
}

export function canBeInvited(invitee: UserWithMembership, team: TeamWithParent) {
  const myLog = log.getSubLogger({ prefix: ["canBeInvited"] });
  myLog.debug("Checking if user can be invited", safeStringify({ invitee, team }));
  const alreadyInvited = invitee.teams?.find(({ teamId: membershipTeamId }) => team.id === membershipTeamId);
  if (alreadyInvited) {
    return INVITE_STATUS.USER_ALREADY_INVITED_OR_MEMBER;
  }

  const orgMembership = invitee.teams?.find((membership) => membership.teamId === team.parentId);

  // An invitee here won't be a member of the team
  // If he is invited to a sub-team and is already part of the organization.
  if (
    team.parentId &&
    new UserRepository(prisma).isAMemberOfOrganization({ user: invitee, organizationId: team.parentId })
  ) {
    return INVITE_STATUS.CAN_BE_INVITED;
  }

  // user invited to join a team inside an org, but has not accepted invite to org yet
  if (team.parentId && orgMembership && !orgMembership.accepted) {
    return INVITE_STATUS.USER_PENDING_MEMBER_OF_THE_ORG;
  }

  const hasDifferentOrganizationProfile = invitee.profiles.some((profile) => {
    const isRegularTeam = !team.isOrganization && !team.parentId;
    if (isRegularTeam) {
      // ⚠️ Inviting to a regular team but the user has a profile with some organization
      return true;
    }

    const isOrganization = team.isOrganization && !team.parentId;
    if (isOrganization) {
      // ⚠️ User has profile with different organization than the organization being invited to
      return profile.organizationId !== team.id;
    }

    // ⚠️ User having profile with an organization is invited to join a sub-team that is not part of the organization
    return profile.organizationId != team.parentId;
  });

  if (
    !ENABLE_PROFILE_SWITCHER &&
    // User having profile with an organization is invited to join a sub-team that is not part of the organization
    hasDifferentOrganizationProfile
  ) {
    return INVITE_STATUS.USER_MEMBER_OF_OTHER_ORGANIZATION;
  }
  return INVITE_STATUS.CAN_BE_INVITED;
}

export async function findUsersWithInviteStatus({
  invitations,
  team,
}: {
  invitations: Invitation[];
  team: TeamWithParent;
}) {
  const usernamesOrEmails = invitations.map((invitation) => invitation.usernameOrEmail);
  const inviteesFromDb: UserWithMembership[] = await prisma.user.findMany({
    where: {
      OR: [
        // Either it's a username in that organization
        {
          profiles: {
            some: {
              organizationId: team.id,
              username: { in: usernamesOrEmails },
            },
          },
        },
        // Or it's an email
        { email: { in: usernamesOrEmails } },
      ],
    },
    select: {
      id: true,
      email: true,
      username: true,
      password: true,
      completedOnboarding: true,
      identityProvider: true,
      profiles: true,
      teams: true,
    },
  });

  const userToRoleMap = buildUserToRoleMap();
  const defaultMemberRole = MembershipRole.MEMBER;
  // Check if the users found in the database can be invited to join the team/org
  return inviteesFromDb.map((inviteeFromDb) => {
    const newRole = getRoleForUser({ email: inviteeFromDb.email, username: inviteeFromDb.username });

    return {
      ...inviteeFromDb,
      newRole: newRole ?? defaultMemberRole,
      canBeInvited: canBeInvited(inviteeFromDb, team),
    };
  });

  function buildUserToRoleMap() {
    const userToRoleMap = new Map<string, MembershipRole>();
    invitations.forEach((invitation) => {
      userToRoleMap.set(invitation.usernameOrEmail, invitation.role);
    });
    return userToRoleMap;
  }

  function getRoleForUser({ email, username }: { email: string; username: string | null }) {
    return userToRoleMap.get(email) || (username ? userToRoleMap.get(username) : defaultMemberRole);
  }
}

export function getOrgConnectionInfo({
  orgAutoAcceptDomain,
  orgVerified,
  isOrg,
  email,
  team,
}: {
  orgAutoAcceptDomain?: string | null;
  orgVerified: boolean | null;
  email: string;
  team: Pick<TeamWithParent, "parentId" | "id">;
  isOrg: boolean;
}) {
  let orgId: number | undefined;
  let autoAccept = false;

  if (team.parentId || isOrg) {
    orgId = team.parentId || team.id;
    if (email.split("@")[1] == orgAutoAcceptDomain) {
      // We discourage self-served organizations from being able to use auto-accept feature by having a barrier of a fixed number of paying teams in the account for creating the organization
      // We can't put restriction of a published organization here because when we move teams during the onboarding of the organization, it isn't published at the moment and we really need those members to be auto-added
      // Further, sensitive operations like member editing and impersonating are disabled by default, unless reviewed by the ADMIN team
      autoAccept = !!orgVerified;
    } else {
      orgId = undefined;
      autoAccept = false;
    }
  }

  return { orgId, autoAccept };
}

export async function createNewUsersConnectToOrgIfExists({
  invitations,
  isOrg,
  teamId,
  parentId,
  autoAcceptEmailDomain,
  orgConnectInfoByUsernameOrEmail,
  isPlatformManaged,
  timeFormat,
  weekStart,
  timeZone,
  language,
  creationSource,
}: {
  invitations: Invitation[];
  isOrg: boolean;
  teamId: number;
  parentId?: number | null;
  autoAcceptEmailDomain: string | null;
  orgConnectInfoByUsernameOrEmail: Record<string, ReturnType<typeof getOrgConnectionInfo>>;
  isPlatformManaged?: boolean;
  timeFormat?: number;
  weekStart?: string;
  timeZone?: string;
  language: string;
  creationSource: CreationSource;
}) {
  // fail if we have invalid emails
  invitations.forEach((invitation) => checkInputEmailIsValid(invitation.usernameOrEmail));
  // from this point we know usernamesOrEmails contains only emails
  const createdUsers = await prisma.$transaction(
    async (tx) => {
      const createdUsers = [];
      for (let index = 0; index < invitations.length; index++) {
        const invitation = invitations[index];
        // Weird but orgId is defined only if the invited user email matches orgAutoAcceptEmail
        const { orgId, autoAccept } = orgConnectInfoByUsernameOrEmail[invitation.usernameOrEmail];
        const [emailUser, emailDomain] = invitation.usernameOrEmail.split("@");
        const [domainName, TLD] = emailDomain.split(".");

        // An org member can't change username during signup, so we set the username
        const orgMemberUsername =
          emailDomain === autoAcceptEmailDomain
            ? slugify(emailUser)
            : slugify(`${emailUser}-${domainName}${isPlatformManaged ? `-${TLD}` : ""}`);

        // As a regular team member is allowed to change username during signup, we don't set any username for him
        const regularTeamMemberUsername = null;

        const isBecomingAnOrgMember = parentId || isOrg;

        const defaultAvailability = getAvailabilityFromSchedule(DEFAULT_SCHEDULE);
        const t = await getTranslation(language ?? "en", "common");
        const createdUser = await tx.user.create({
          data: {
            username: isBecomingAnOrgMember ? orgMemberUsername : regularTeamMemberUsername,
            email: invitation.usernameOrEmail,
            verified: true,
            invitedTo: teamId,
            isPlatformManaged: !!isPlatformManaged,
            timeFormat,
            weekStart,
            timeZone,
            creationSource,
            organizationId: orgId || null, // If the user is invited to a child team, they are automatically added to the parent org
            ...(orgId
              ? {
                  profiles: {
                    createMany: {
                      data: [
                        {
                          uid: ProfileRepository.generateProfileUid(),
                          username: orgMemberUsername,
                          organizationId: orgId,
                        },
                      ],
                    },
                  },
                }
              : null),
            teams: {
              create: {
                teamId: teamId,
                role: invitation.role,
                accepted: autoAccept, // If the user is invited to a child team, they are automatically accepted
              },
            },
            ...(!isPlatformManaged
              ? {
                  schedules: {
                    create: {
                      name: t("default_schedule_name"),
                      availability: {
                        createMany: {
                          data: defaultAvailability.map((schedule) => ({
                            days: schedule.days,
                            startTime: schedule.startTime,
                            endTime: schedule.endTime,
                          })),
                        },
                      },
                    },
                  },
                }
              : {}),
          },
        });

        // We also need to create the membership in the parent org if it exists
        if (parentId) {
          await tx.membership.create({
            data: {
              createdAt: new Date(),
              teamId: parentId,
              userId: createdUser.id,
              role: MembershipRole.MEMBER,
              accepted: autoAccept,
            },
          });
        }
        createdUsers.push(createdUser);
      }
      return createdUsers;
    },
    { timeout: 10000 }
  );

  if (createdUsers.length > 0) {
    const seatTracker = new SeatChangeTrackingService();
    const trackingTeamId = parentId ?? teamId;
    await seatTracker.logSeatAddition({
      teamId: trackingTeamId,
      seatCount: createdUsers.length,
    });
  }

  return createdUsers;
}

type TeamAndOrganizationSettings = Team & {
  organizationSettings?: OrganizationSettings | null;
};

export function getOrgState(
  isOrg: boolean,
  team: TeamAndOrganizationSettings & {
    parent: TeamAndOrganizationSettings | null;
  }
) {
  const parentSettings = team.parent?.organizationSettings;

  if (isOrg && team.organizationSettings?.orgAutoAcceptEmail) {
    return {
      isInOrgScope: true,
      orgVerified: team.organizationSettings.isOrganizationVerified,
      orgConfigured: team.organizationSettings.isOrganizationConfigured,
      autoAcceptEmailDomain: team.organizationSettings.orgAutoAcceptEmail,
      orgPublished: !!team.slug,
    };
  } else if (parentSettings?.orgAutoAcceptEmail) {
    return {
      isInOrgScope: true,
      orgVerified: parentSettings.isOrganizationVerified,
      orgConfigured: parentSettings.isOrganizationConfigured,
      autoAcceptEmailDomain: parentSettings.orgAutoAcceptEmail,
      orgPublished: !!team.parent?.slug,
    };
  }

  return {
    isInOrgScope: false,
    orgVerified: null,
    autoAcceptEmailDomain: null,
    orgConfigured: null,
    orgPublished: null,
  };
}

export function getAutoJoinStatus({
  team,
  invitee,
  connectionInfoMap,
}: {
  team: TeamWithParent;
  invitee: UserWithMembership;
  connectionInfoMap: Record<string, ReturnType<typeof getOrgConnectionInfo>>;
}) {
  const isRegularTeam = !team.isOrganization && !team.parentId;

  if (isRegularTeam) {
    // There are no-auto join in regular teams ever
    return {
      autoAccept: false,
      // Following are not relevant for regular teams
      needToCreateProfile: null,
      needToCreateOrgMembership: null,
    };
  }

  const isAutoAcceptEmail = connectionInfoMap[invitee.email].autoAccept;
  const isUserMemberOfTheTeamsParentOrganization = team.parentId
    ? new UserRepository(prisma).isAMemberOfOrganization({ user: invitee, organizationId: team.parentId })
    : null;

  if (isUserMemberOfTheTeamsParentOrganization) {
    const orgMembership = invitee.teams?.find((membership) => membership.teamId === team.parentId);

    const isAMemberOfOrg = orgMembership?.accepted;
    return {
      autoAccept: isAMemberOfOrg,
      // User is a member of parent organization already - So, no need to create profile and membership with Org
      needToCreateProfile: false,
      needToCreateOrgMembership: false,
    };
  }

  if (isAutoAcceptEmail) {
    // User is not a member of parent organization but has autoAccept email
    // We need to create profile as well as membership with the Org in this case
    return {
      autoAccept: true,
      needToCreateProfile: true,
      needToCreateOrgMembership: true,
    };
  }

  return {
    autoAccept: false,
    needToCreateProfile: false,
    needToCreateOrgMembership: true,
  };
}

// split invited users between ones that can autojoin and the others who cannot autojoin
export const groupUsersByJoinability = ({
  existingUsersWithMemberships,
  team,
  connectionInfoMap,
}: {
  team: TeamWithParent;
  existingUsersWithMemberships: InvitableExistingUserWithProfile[];
  connectionInfoMap: Record<string, ReturnType<typeof getOrgConnectionInfo>>;
}) => {
  const usersToAutoJoin = [];
  const regularUsers = [];

  for (let index = 0; index < existingUsersWithMemberships.length; index++) {
    const existingUserWithMemberships = existingUsersWithMemberships[index];
    const autoJoinStatus = getAutoJoinStatus({
      invitee: existingUserWithMemberships,
      team,
      connectionInfoMap,
    });

    if (autoJoinStatus.autoAccept) {
      usersToAutoJoin.push({
        ...existingUserWithMemberships,
        ...autoJoinStatus,
      });
    } else {
      regularUsers.push({
        ...existingUserWithMemberships,
        ...autoJoinStatus,
      });
    }
  }

  return [usersToAutoJoin, regularUsers];
};

export async function handleExistingUsersInvites({
  invitableExistingUsers,
  team,
  orgConnectInfoByUsernameOrEmail,
  teamId,
  language,
  inviter,
  orgSlug,
  isOrg,
}: {
  invitableExistingUsers: InvitableExistingUser[];
  team: TeamWithParent;
  orgConnectInfoByUsernameOrEmail: Record<string, { orgId: number | undefined; autoAccept: boolean }>;
  teamId: number;
  language: string;
  inviter: {
    name: string | null;
  };
  isOrg: boolean;
  orgSlug: string | null;
}) {
  const translation = await getTranslation(language, "common");
  if (!team.isOrganization) {
    const [autoJoinUsers, regularUsers] = groupUsersByJoinability({
      existingUsersWithMemberships: invitableExistingUsers.map((u) => {
        return {
          ...u,
          profile: null,
        };
      }),
      team,
      connectionInfoMap: orgConnectInfoByUsernameOrEmail,
    });

    log.debug(
      "Inviting existing users to a team",
      safeStringify({
        autoJoinUsers,
        regularUsers,
      })
    );

    // invited users can autojoin, create their memberships in org
    if (autoJoinUsers.length) {
      await createMemberships({
        teamId,
        language,
        invitees: autoJoinUsers,
        parentId: team.parentId,
        accepted: true,
      });

      await Promise.all(
        autoJoinUsers.map(async (userToAutoJoin) => {
          await updateNewTeamMemberEventTypes(userToAutoJoin.id, team.id);
        })
      );

      await sendExistingUserTeamInviteEmails({
        currentUserName: inviter.name,
        currentUserTeamName: team?.name,
        existingUsersWithMemberships: autoJoinUsers,
        language: translation,
        isOrg: isOrg,
        teamId: team.id,
        isAutoJoin: true,
        currentUserParentTeamName: team?.parent?.name,
        orgSlug,
      });
    }

    // invited users cannot autojoin, create provisional memberships and send email
    if (regularUsers.length) {
      await createMemberships({
        teamId,
        language,
        invitees: regularUsers,
        parentId: team.parentId,
        accepted: false,
      });
      await sendExistingUserTeamInviteEmails({
        currentUserName: inviter.name,
        currentUserTeamName: team?.name,
        existingUsersWithMemberships: regularUsers,
        language: translation,
        isOrg: isOrg,
        teamId: team.id,
        isAutoJoin: false,
        currentUserParentTeamName: team?.parent?.name,
        orgSlug,
      });
    }

    const parentOrganization = team.parent;
    if (parentOrganization) {
      const parsedOrg = getParsedTeam(parentOrganization);
      // Create profiles if needed
      await Promise.all(
        autoJoinUsers
          .concat(regularUsers)
          .filter((u) => u.needToCreateProfile)
          .map((user) =>
            createAProfileForAnExistingUser({
              user: {
                id: user.id,
                email: user.email,
                currentUsername: user.username,
              },
              organizationId: parsedOrg.id,
            })
          )
      );
    }
  } else {
    const organization = team;
    log.debug(
      "Inviting existing users to an organization",
      safeStringify({
        invitableExistingUsers,
      })
    );

    const existingUsersWithMembershipsNew = await Promise.all(
      invitableExistingUsers.map(async (user) => {
        const shouldAutoAccept = orgConnectInfoByUsernameOrEmail[user.email].autoAccept;
        let profile = null;
        if (shouldAutoAccept) {
          profile = await createAProfileForAnExistingUser({
            user: {
              id: user.id,
              email: user.email,
              currentUsername: user.username,
            },
            organizationId: organization.id,
          });
        }

        await prisma.membership.create({
          data: {
            createdAt: new Date(),
            userId: user.id,
            teamId: team.id,
            accepted: shouldAutoAccept,
            role: user.newRole,
          },
        });

        // If auto-accepting into org, also accept any pending sub-team memberships
        if (shouldAutoAccept) {
          await prisma.membership.updateMany({
            where: {
              userId: user.id,
              accepted: false,
              team: {
                parentId: organization.id,
              },
            },
            data: {
              accepted: true,
            },
          });
        }
        return {
          ...user,
          profile,
        };
      })
    );

    if (!team.parentId && existingUsersWithMembershipsNew.length > 0) {
      const seatTracker = new SeatChangeTrackingService();
      await seatTracker.logSeatAddition({
        teamId: team.id,
        seatCount: existingUsersWithMembershipsNew.length,
      });
    }

    const autoJoinUsers = existingUsersWithMembershipsNew.filter(
      (user) => orgConnectInfoByUsernameOrEmail[user.email].autoAccept
    );

    const regularUsers = existingUsersWithMembershipsNew.filter(
      (user) => !orgConnectInfoByUsernameOrEmail[user.email].autoAccept
    );

    // Send emails to user who auto-joined
    await sendExistingUserTeamInviteEmails({
      currentUserName: inviter.name,
      currentUserTeamName: team?.name,
      existingUsersWithMemberships: autoJoinUsers,
      language: translation,
      isOrg,
      teamId: team.id,
      isAutoJoin: true,
      currentUserParentTeamName: team?.parent?.name,
      orgSlug,
    });

    // Send emails to user who need to accept invite
    await sendExistingUserTeamInviteEmails({
      currentUserName: inviter.name,
      currentUserTeamName: team?.name,
      existingUsersWithMemberships: regularUsers,
      language: translation,
      isOrg,
      teamId: team.id,
      isAutoJoin: false,
      currentUserParentTeamName: team?.parent?.name,
      orgSlug,
    });
  }
}

export async function handleNewUsersInvites({
  invitationsForNewUsers,
  team,
  orgConnectInfoByUsernameOrEmail,
  teamId,
  language,
  isOrg,
  autoAcceptEmailDomain,
  inviter,
  creationSource,
}: {
  invitationsForNewUsers: Invitation[];
  teamId: number;
  language: string;
  orgConnectInfoByUsernameOrEmail: Record<string, { orgId: number | undefined; autoAccept: boolean }>;
  autoAcceptEmailDomain: string | null;
  team: TeamWithParent;
  inviter: {
    name: string | null;
  };
  isOrg: boolean;
  creationSource: CreationSource;
}) {
  const translation = await getTranslation(language, "common");

  const createdUsers = await createNewUsersConnectToOrgIfExists({
    invitations: invitationsForNewUsers,
    isOrg,
    teamId: teamId,
    orgConnectInfoByUsernameOrEmail,
    autoAcceptEmailDomain: autoAcceptEmailDomain,
    parentId: team.parentId,
    language,
    creationSource,
  });

  // Add auto-accepted users to team event types with assignAllTeamMembers immediately
  // Only teams have event types with assignAllTeamMembers, not organizations
  if (!isOrg) {
    const autoAcceptedUserIds = createdUsers
      .filter((user) => orgConnectInfoByUsernameOrEmail[user.email].autoAccept)
      .map((user) => user.id);

    if (autoAcceptedUserIds.length > 0) {
      const results = await Promise.allSettled(
        autoAcceptedUserIds.map((userId) => updateNewTeamMemberEventTypes(userId, teamId))
      );
      results.forEach((result) => {
        if (result.status === "rejected") {
          log.error("Error updating new team member event types for user", result.reason);
        }
      });
    }
  }

  const sendVerifyEmailsPromises = invitationsForNewUsers.map((invitation) => {
    return sendSignupToOrganizationEmail({
      usernameOrEmail: invitation.usernameOrEmail,
      team: {
        name: team.name,
        parent: team.parent,
      },
      translation,
      inviterName: inviter.name ?? "",
      teamId,
      isOrg,
    });
  });
  await sendEmails(sendVerifyEmailsPromises);
}
