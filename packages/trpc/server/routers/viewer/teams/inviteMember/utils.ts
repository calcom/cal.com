import { randomBytes } from "crypto";
import type { TFunction } from "next-i18next";

import { getOrgFullOrigin } from "@calcom/ee/organizations/lib/orgDomains";
import { sendTeamInviteEmail } from "@calcom/emails";
import { ENABLE_PROFILE_SWITCHER, WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { isTeamAdmin } from "@calcom/lib/server/queries";
import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import { UserRepository } from "@calcom/lib/server/repository/user";
import slugify from "@calcom/lib/slugify";
import { prisma } from "@calcom/prisma";
import type { Membership, OrganizationSettings, Team } from "@calcom/prisma/client";
import { Prisma, type User as UserType, type UserPassword } from "@calcom/prisma/client";
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

export async function checkPermissions({
  userId,
  teamId,
  isOrg,
}: {
  userId: number;
  teamId: number;
  isOrg?: boolean;
}) {
  // Checks if the team they are inviteing to IS the org. Not a child team
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

export async function getUsernameOrEmailsToInvite(usernameOrEmail: string | string[]) {
  const emailsToInvite = Array.isArray(usernameOrEmail)
    ? Array.from(new Set(usernameOrEmail))
    : [usernameOrEmail];

  if (emailsToInvite.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You must provide at least one email address to invite.",
    });
  }

  return emailsToInvite;
}

export function canBeInvited(invitee: UserWithMembership, team: TeamWithParent) {
  const myLog = log.getSubLogger({ prefix: ["canBeInvited"] });
  myLog.debug("Checking if user can be invited", safeStringify({ invitee, team }));
  const alreadyInvited = invitee.teams?.find(({ teamId: membershipTeamId }) => team.id === membershipTeamId);
  if (alreadyInvited) {
    return false;
  }

  const orgMembership = invitee.teams?.find((membersip) => membersip.teamId === team.parentId);
  // invitee is invited to the org's team and is already part of the organization
  if (
    team.parentId &&
    UserRepository.isAMemberOfOrganization({ user: invitee, organizationId: team.parentId })
  ) {
    return true;
  }

  // user invited to join a team inside an org, but has not accepted invite to org yet
  if (team.parentId && orgMembership && !orgMembership.accepted) {
    return false;
  }

  if (
    !ENABLE_PROFILE_SWITCHER &&
    // Member of an organization is invited to join a team that is not a subteam of the organization
    invitee.profiles.find((profile) => profile.organizationId != team.parentId)
  ) {
    return false;
  }
  return true;
}

export async function getExistingUsersToInvite({
  usernamesOrEmails,
  team,
}: {
  usernamesOrEmails: string[];
  team: TeamWithParent;
}) {
  const invitees: UserWithMembership[] = await prisma.user.findMany({
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

  // Check if the users found in the database can be invited to join the team/org
  return invitees.map((invitee) => {
    return {
      ...invitee,
      canBeInvited: canBeInvited(invitee, team),
    };
  });
}

export function getOrgConnectionInfo({
  orgAutoAcceptDomain,
  orgVerified,
  isOrg,
  usersEmail,
  team,
}: {
  orgAutoAcceptDomain?: string | null;
  orgVerified: boolean;
  usersEmail: string;
  team: TeamWithParent;
  isOrg: boolean;
}) {
  let orgId: number | undefined = undefined;
  let autoAccept = false;

  if (team.parentId || isOrg) {
    orgId = team.parentId || team.id;
    if (usersEmail.split("@")[1] == orgAutoAcceptDomain) {
      // We discourage self-served organizations from being able to auto-accept feature by having a barrier of a fixed number of paying teams in the account for creating the organization
      // We can't put restriction of a published organization here because when we move teams during the onboarding of the organization, it isn't published at the moment and we really need those members to be auto-added
      // Further, sensitive operations like member editing and impersonating are disabled by default, unless reviewed by the ADMIN team
      autoAccept = orgVerified;
    } else {
      orgId = undefined;
      autoAccept = false;
    }
  }

  return { orgId, autoAccept };
}

export async function createNewUsersConnectToOrgIfExists({
  usernamesOrEmails,
  input,
  parentId,
  autoAcceptEmailDomain,
  connectionInfoMap,
  isPlatformManaged,
}: {
  usernamesOrEmails: string[];
  input: InviteMemberOptions["input"];
  parentId?: number | null;
  autoAcceptEmailDomain?: string;
  connectionInfoMap: Record<string, ReturnType<typeof getOrgConnectionInfo>>;
  isPlatformManaged?: boolean;
}) {
  // fail if we have invalid emails
  usernamesOrEmails.forEach((usernameOrEmail) => checkInputEmailIsValid(usernameOrEmail));
  // from this point we know usernamesOrEmails contains only emails
  const createdUsers = await prisma.$transaction(
    async (tx) => {
      const createdUsers = [];
      for (let index = 0; index < usernamesOrEmails.length; index++) {
        const usernameOrEmail = usernamesOrEmails[index];
        // Weird but orgId is defined only if the invited user email matches orgAutoAcceptEmail
        const { orgId, autoAccept } = connectionInfoMap[usernameOrEmail];
        const [emailUser, emailDomain] = usernameOrEmail.split("@");

        // An org member can't change username during signup, so we set the username
        const orgMemberUsername =
          emailDomain === autoAcceptEmailDomain
            ? slugify(emailUser)
            : slugify(`${emailUser}-${emailDomain.split(".")[0]}`);

        // As a regular team member is allowed to change username during signup, we don't set any username for him
        const regularTeamMemberUsername = null;

        const isBecomingAnOrgMember = parentId || input.isOrg;

        const createdUser = await tx.user.create({
          data: {
            username: isBecomingAnOrgMember ? orgMemberUsername : regularTeamMemberUsername,
            email: usernameOrEmail,
            verified: true,
            invitedTo: input.teamId,
            isPlatformManaged: !!isPlatformManaged,
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
                teamId: input.teamId,
                role: input.role as MembershipRole,
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
  input: InviteMemberOptions["input"];
  invitees: (UserWithMembership & {
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
              : input.role,
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
    console.error(e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      // Don't throw an error if the user is already a member of the team when inviting multiple users
      if (!Array.isArray(input.usernameOrEmail) && e.code === "P2002") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This user is a member of this team / has a pending invitation.",
        });
      } else if (Array.isArray(input.usernameOrEmail) && e.code === "P2002") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Trying to invite users already members of this team / have pending invitations",
        });
      }
      logger.error("Failed to create memberships", input.teamId);
    } else throw e;
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
  team: Awaited<ReturnType<typeof getTeamOrThrow>>;
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

export function getIsOrgVerified(
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
  } as {
    isInOrgScope: false;
    orgVerified: never;
    autoAcceptEmailDomain: never;
    orgConfigured: never;
    orgPublished: never;
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
  existingUsersWithMemberships: (UserWithMembership & {
    profile: {
      username: string;
    } | null;
  })[];
  connectionInfoMap: Record<string, ReturnType<typeof getOrgConnectionInfo>>;
}) => {
  const usersToAutoJoin = [];
  const regularUsers = [];

  for (let index = 0; index < existingUsersWithMemberships.length; index++) {
    const existingUserWithMembersips = existingUsersWithMemberships[index];

    const autoJoinStatus = getAutoJoinStatus({
      invitee: existingUserWithMembersips,
      team,
      connectionInfoMap,
    });

    autoJoinStatus.autoAccept
      ? usersToAutoJoin.push({
          ...existingUserWithMembersips,
          ...autoJoinStatus,
        })
      : regularUsers.push({
          ...existingUserWithMembersips,
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
  existingUsersWithMemberships: (UserWithMembership & {
    profile: {
      username: string;
    } | null;
  })[];
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
