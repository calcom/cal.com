import { randomBytes } from "crypto";
import type { TFunction } from "next-i18next";

import { getOrgFullOrigin } from "@calcom/ee/organizations/lib/orgDomains";
import { sendTeamInviteEmail } from "@calcom/emails";
import { ENABLE_PROFILE_SWITCHER, WEBAPP_URL } from "@calcom/lib/constants";
import { createAProfileForAnExistingUser } from "@calcom/lib/createAProfileForAnExistingUser";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import { updateNewTeamMemberEventTypes } from "@calcom/lib/server/queries";
import { isTeamAdmin } from "@calcom/lib/server/queries";
import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import { getParsedTeam } from "@calcom/lib/server/repository/teamUtils";
import { UserRepository } from "@calcom/lib/server/repository/user";
import slugify from "@calcom/lib/slugify";
import { prisma } from "@calcom/prisma";
import type { Membership, OrganizationSettings, Team } from "@calcom/prisma/client";
import { type User as UserType, type UserPassword, Prisma } from "@calcom/prisma/client";
import type { Profile as ProfileType } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import { isEmail } from "../util";
import type { InviteMemberOptions, TeamWithParent } from "./types";

const log = logger.getSubLogger({ prefix: ["inviteMember.utils"] });
export type Invitee = Pick<
  UserType,
  "id" | "email" | "username" | "identityProvider" | "completedOnboarding"
>;

export type UserWithMembership = Invitee & {
  teams?: Pick<Membership, "userId" | "teamId" | "accepted" | "role">[];
  profiles: ProfileType[];
  password: UserPassword | null;
};

export type Invitation = {
  usernameOrEmail: string;
  role: MembershipRole;
};

type ExistingUserWithInviteStatus = Awaited<ReturnType<typeof findUsersWithInviteStatus>>[number];
type ExistingUserWithInviteStatusAndProfile = ExistingUserWithInviteStatus & {
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
  // Checks if the team they are inviting to IS the org. Not a child team
  if (isOrg) {
    if (!(await isOrganisationAdmin(userId, teamId))) throw new TRPCError({ code: "UNAUTHORIZED" });
  } else {
    // TODO: do some logic here to check if the user is inviting a NEW user to a team that ISNT in the same org
    if (!(await isTeamAdmin(userId, teamId))) throw new TRPCError({ code: "UNAUTHORIZED" });
  }
}

export function checkInputEmailIsValid(email: string) {
  if (!isEmail(email))
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invite failed because ${email} is not a valid email address`,
    });
}

export async function getTeamOrThrow(teamId: number) {
  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
    },
    include: {
      organizationSettings: true,
      parent: {
        include: {
          organizationSettings: true,
        },
      },
    },
  });

  if (!team)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Team not found`,
    });

  return { ...team, metadata: teamMetadataSchema.parse(team.metadata) };
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

export const enum INVITE_STATUS {
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
    UserRepository.isAMemberOfOrganization({ user: invitee, organizationId: team.parentId })
  ) {
    return INVITE_STATUS.CAN_BE_INVITED;
  }

  // user invited to join a team inside an org, but has not accepted invite to org yet
  if (team.parentId && orgMembership && !orgMembership.accepted) {
    return INVITE_STATUS.USER_PENDING_MEMBER_OF_THE_ORG;
  }

  if (
    !ENABLE_PROFILE_SWITCHER &&
    // Member of an organization is invited to join a team that is not a subteam of the organization
    invitee.profiles.find((profile) => profile.organizationId != team.parentId)
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
  let orgId: number | undefined = undefined;
  let autoAccept = false;

  if (team.parentId || isOrg) {
    orgId = team.parentId || team.id;
    if (email.split("@")[1] == orgAutoAcceptDomain) {
      // We discourage self-served organizations from being able to auto-accept feature by having a barrier of a fixed number of paying teams in the account for creating the organization
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

        // An org member can't change username during signup, so we set the username
        const orgMemberUsername =
          emailDomain === autoAcceptEmailDomain
            ? slugify(emailUser)
            : slugify(`${emailUser}-${emailDomain.split(".")[0]}`);

        // As a regular team member is allowed to change username during signup, we don't set any username for him
        const regularTeamMemberUsername = null;

        const isBecomingAnOrgMember = parentId || isOrg;

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
          },
        });

        // We also need to create the membership in the parent org if it exists
        if (parentId) {
          await tx.membership.create({
            data: {
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
  return createdUsers;
}

export async function createMemberships({
  input,
  invitees,
  parentId,
  accepted,
}: {
  input: Omit<InviteMemberOptions["input"], "usernameOrEmail">;
  invitees: (ExistingUserWithInviteStatus & {
    needToCreateOrgMembership: boolean | null;
  })[];
  parentId: number | null;
  accepted: boolean;
}) {
  log.debug("Creating memberships for", safeStringify({ input, invitees, parentId, accepted }));
  try {
    await prisma.membership.createMany({
      data: invitees.flatMap((invitee) => {
        const organizationRole = invitee?.teams?.[0]?.role;
        const data = [];
        // membership for the team
        data.push({
          teamId: input.teamId,
          userId: invitee.id,
          accepted,
          role:
            organizationRole === MembershipRole.ADMIN || organizationRole === MembershipRole.OWNER
              ? organizationRole
              : invitee.newRole,
        });

        // membership for the org
        if (parentId && invitee.needToCreateOrgMembership) {
          data.push({
            accepted,
            teamId: parentId,
            userId: invitee.id,
            role: MembershipRole.MEMBER,
          });
        }
        return data;
      }),
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      logger.error("Failed to create memberships", input.teamId);
    } else {
      throw e;
    }
  }
}

export async function sendSignupToOrganizationEmail({
  usernameOrEmail,
  team,
  translation,
  inviterName,
  teamId,
  isOrg,
}: {
  usernameOrEmail: string;
  team: { name: string; parent: { name: string } | null };
  translation: TFunction;
  inviterName: string;
  teamId: number;
  isOrg: boolean;
}) {
  const token: string = randomBytes(32).toString("hex");

  await prisma.verificationToken.create({
    data: {
      identifier: usernameOrEmail,
      token,
      expires: new Date(new Date().setHours(168)), // +1 week
      team: {
        connect: {
          id: teamId,
        },
      },
    },
  });
  await sendTeamInviteEmail({
    language: translation,
    from: inviterName || `${team.name}'s admin`,
    to: usernameOrEmail,
    teamName: team.name,
    joinLink: `${WEBAPP_URL}/signup?token=${token}&callbackUrl=/getting-started`,
    isCalcomMember: false,
    isOrg: isOrg,
    parentTeamName: team?.parent?.name,
    isAutoJoin: false,
    isExistingUserMovedToOrg: false,
    // For a new user there is no prev and new links.
    prevLink: null,
    newLink: null,
  });
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
    ? UserRepository.isAMemberOfOrganization({ user: invitee, organizationId: team.parentId })
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
  existingUsersWithMemberships: ExistingUserWithInviteStatusAndProfile[];
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

    autoJoinStatus.autoAccept
      ? usersToAutoJoin.push({
          ...existingUserWithMemberships,
          ...autoJoinStatus,
        })
      : regularUsers.push({
          ...existingUserWithMemberships,
          ...autoJoinStatus,
        });
  }

  return [usersToAutoJoin, regularUsers];
};

export const sendEmails = async (emailPromises: Promise<void>[]) => {
  const sentEmails = await Promise.allSettled(emailPromises);
  sentEmails.forEach((sentEmail) => {
    if (sentEmail.status === "rejected") {
      logger.error("Could not send email to user. Reason:", sentEmail.reason);
    }
  });
};

export const sendExistingUserTeamInviteEmails = async ({
  existingUsersWithMemberships,
  language,
  currentUserTeamName,
  currentUserName,
  currentUserParentTeamName,
  isOrg,
  teamId,
  isAutoJoin,
  orgSlug,
}: {
  language: TFunction;
  isAutoJoin: boolean;
  existingUsersWithMemberships: Omit<ExistingUserWithInviteStatusAndProfile, "canBeInvited" | "newRole">[];
  currentUserTeamName?: string;
  currentUserParentTeamName: string | undefined;
  currentUserName?: string | null;
  isOrg: boolean;
  teamId: number;
  orgSlug: string | null;
}) => {
  const sendEmailsPromises = existingUsersWithMemberships.map(async (user) => {
    let sendTo = user.email;
    if (!isEmail(user.email)) {
      sendTo = user.email;
    }

    log.debug("Sending team invite email to", safeStringify({ user, currentUserName, currentUserTeamName }));

    if (!currentUserTeamName) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "The team doesn't have a name",
      });
    }

    // inform user of membership by email
    if (currentUserTeamName) {
      const inviteTeamOptions = {
        joinLink: `${WEBAPP_URL}/auth/login?callbackUrl=/settings/teams`,
        isCalcomMember: true,
      };
      /**
       * Here we want to redirect to a different place if onboarding has been completed or not. This prevents the flash of going to teams -> Then to onboarding - also show a different email template.
       * This only changes if the user is a CAL user and has not completed onboarding and has no password
       */
      if (!user.completedOnboarding && !user.password?.hash && user.identityProvider === "CAL") {
        const token = randomBytes(32).toString("hex");
        await prisma.verificationToken.create({
          data: {
            identifier: user.email,
            token,
            expires: new Date(new Date().setHours(168)), // +1 week
            team: {
              connect: {
                id: teamId,
              },
            },
          },
        });

        inviteTeamOptions.joinLink = `${WEBAPP_URL}/signup?token=${token}&callbackUrl=/getting-started`;
        inviteTeamOptions.isCalcomMember = false;
      }

      return sendTeamInviteEmail({
        language,
        isAutoJoin,
        from: currentUserName ?? `${currentUserTeamName}'s admin`,
        to: sendTo,
        teamName: currentUserTeamName,
        ...inviteTeamOptions,
        isOrg: isOrg,
        parentTeamName: currentUserParentTeamName,
        isExistingUserMovedToOrg: true,
        prevLink: `${getOrgFullOrigin("")}/${user.username || ""}`,
        newLink: user.profile ? `${getOrgFullOrigin(orgSlug ?? "")}/${user.profile.username}` : null,
      });
    }
  });

  await sendEmails(sendEmailsPromises);
};

type inviteMemberHandlerInput = {
  teamId: number;
  role?: "ADMIN" | "MEMBER" | "OWNER";
  isOrg: boolean;
  language: string;
};

export async function handleExistingUsersInvites({
  invitableExistingUsers,
  team,
  orgConnectInfoByUsernameOrEmail,
  input,
  inviter,
  orgSlug,
}: {
  invitableExistingUsers: Awaited<ReturnType<typeof findUsersWithInviteStatus>>;
  team: TeamWithParent;
  orgConnectInfoByUsernameOrEmail: Record<string, { orgId: number | undefined; autoAccept: boolean }>;
  input: inviteMemberHandlerInput;
  inviter: {
    name: string | null;
  };
  orgSlug: string | null;
}) {
  const translation = await getTranslation(input.language ?? "en", "common");
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
        input,
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
        isOrg: input.isOrg,
        teamId: team.id,
        isAutoJoin: true,
        currentUserParentTeamName: team?.parent?.name,
        orgSlug,
      });
    }

    // invited users cannot autojoin, create provisional memberships and send email
    if (regularUsers.length) {
      await createMemberships({
        input,
        invitees: regularUsers,
        parentId: team.parentId,
        accepted: false,
      });
      await sendExistingUserTeamInviteEmails({
        currentUserName: inviter.name,
        currentUserTeamName: team?.name,
        existingUsersWithMemberships: regularUsers,
        language: translation,
        isOrg: input.isOrg,
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
      await Promise.all([
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
          ),
      ]);
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
            userId: user.id,
            teamId: team.id,
            accepted: shouldAutoAccept,
            role: user.newRole,
          },
        });
        return {
          ...user,
          profile,
        };
      })
    );

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
      isOrg: input.isOrg,
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
      isOrg: input.isOrg,
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
  input,
  autoAcceptEmailDomain,
  inviter,
}: {
  invitationsForNewUsers: Invitation[];
  input: inviteMemberHandlerInput;
  orgConnectInfoByUsernameOrEmail: Record<string, { orgId: number | undefined; autoAccept: boolean }>;
  autoAcceptEmailDomain: string | null;
  team: TeamWithParent;
  inviter: {
    name: string | null;
  };
}) {
  const translation = await getTranslation(input.language ?? "en", "common");

  await createNewUsersConnectToOrgIfExists({
    invitations: invitationsForNewUsers,
    isOrg: input.isOrg,
    teamId: input.teamId,
    orgConnectInfoByUsernameOrEmail,
    autoAcceptEmailDomain: autoAcceptEmailDomain,
    parentId: team.parentId,
  });

  const sendVerifyEmailsPromises = invitationsForNewUsers.map((invitation) => {
    return sendSignupToOrganizationEmail({
      usernameOrEmail: invitation.usernameOrEmail,
      team: {
        name: team.name,
        parent: team.parent,
      },
      translation,
      inviterName: inviter.name ?? "",
      teamId: input.teamId,
      isOrg: input.isOrg,
    });
  });
  await sendEmails(sendVerifyEmailsPromises);
}
