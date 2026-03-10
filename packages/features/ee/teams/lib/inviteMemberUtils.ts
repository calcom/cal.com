import { randomBytes } from "node:crypto";
import { getOrgFullOrigin } from "@calcom/ee/organizations/lib/orgDomains";
import { sendTeamInviteEmail } from "@calcom/emails/organization-email-service";
import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { SeatChangeTrackingService } from "@calcom/features/ee/billing/service/seatTracking/SeatChangeTrackingService";
import { OnboardingPathService } from "@calcom/features/onboarding/lib/onboarding-path.service";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import type {
  Membership,
  Profile as ProfileType,
  UserPassword,
  User as UserType,
} from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import type { TFunction } from "i18next";

const log = logger.getSubLogger({ prefix: ["inviteMember.utils"] });

const isEmail = (str: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);

export type Invitee = Pick<
  UserType,
  "id" | "email" | "username" | "identityProvider" | "completedOnboarding"
>;

export type UserWithMembership = Invitee & {
  teams?: Pick<Membership, "userId" | "teamId" | "accepted" | "role">[];
  profiles: ProfileType[];
  password: UserPassword | null;
};

type InvitableExistingUser = UserWithMembership & {
  newRole: MembershipRole;
};

type InvitableExistingUserWithProfile = InvitableExistingUser & {
  profile: {
    username: string;
  } | null;
};

export async function getTeamOrThrow(teamId: number) {
  const team = await prisma.team.findUnique({
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

  if (!team) throw new ErrorWithCode(ErrorCode.NotFound, "Team not found");

  return { ...team, metadata: teamMetadataSchema.parse(team.metadata) };
}

const createVerificationToken = async (identifier: string, teamId: number) => {
  const token = randomBytes(32).toString("hex");
  return prisma.verificationToken.create({
    data: {
      identifier,
      token,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +1 week
      team: {
        connect: {
          id: teamId,
        },
      },
    },
  });
};

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
  try {
    const verificationToken = await createVerificationToken(usernameOrEmail, teamId);
    const gettingStartedPath = await OnboardingPathService.getGettingStartedPathWhenInvited();
    await sendTeamInviteEmail({
      language: translation,
      from: inviterName || `${team.name}'s admin`,
      to: usernameOrEmail,
      teamName: team.name,
      joinLink: `${WEBAPP_URL}/signup?token=${verificationToken.token}&callbackUrl=${gettingStartedPath}`,
      isCalcomMember: false,
      isOrg: isOrg,
      parentTeamName: team?.parent?.name,
      isAutoJoin: false,
      isExistingUserMovedToOrg: false,
      // For a new user there is no prev and new links.
      prevLink: null,
      newLink: null,
    });
  } catch (error) {
    logger.error(
      "Failed to send signup to organization email",
      safeStringify({
        usernameOrEmail,
        orgId: teamId,
      }),
      error
    );
  }
}

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
  existingUsersWithMemberships: Omit<InvitableExistingUserWithProfile, "canBeInvited" | "newRole">[];
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
      throw new ErrorWithCode(ErrorCode.InternalServerError, "The team doesn't have a name");
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
        const verificationToken = await createVerificationToken(user.email, teamId);

        const gettingStartedPath = await OnboardingPathService.getGettingStartedPathWhenInvited();
        inviteTeamOptions.joinLink = `${WEBAPP_URL}/signup?token=${verificationToken.token}&callbackUrl=${gettingStartedPath}`;
        inviteTeamOptions.isCalcomMember = false;
      } else if (!isAutoJoin) {
        let verificationToken = await prisma.verificationToken.findFirst({
          where: {
            identifier: user.email,
            teamId: teamId,
          },
        });

        if (!verificationToken) {
          verificationToken = await createVerificationToken(user.email, teamId);
        }
        inviteTeamOptions.joinLink = `${WEBAPP_URL}/teams?token=${verificationToken.token}&autoAccept=true`;
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

export async function createMemberships({
  teamId,
  language,
  invitees,
  parentId,
  accepted,
}: {
  teamId: number;
  language: string;
  invitees: (UserWithMembership & {
    newRole: MembershipRole;
    needToCreateOrgMembership: boolean | null;
  })[];
  parentId: number | null;
  accepted: boolean;
}) {
  log.debug("Creating memberships for", safeStringify({ teamId, language, invitees, parentId, accepted }));

  const createdAt = new Date();

  const teamMembershipData = invitees.map((invitee) => {
    const organizationRole = parentId
      ? invitee?.teams?.find((membership) => membership.teamId === parentId)?.role
      : undefined;
    return {
      createdAt,
      teamId,
      userId: invitee.id,
      accepted,
      role: checkAdminOrOwner(organizationRole) ? organizationRole : invitee.newRole,
    };
  });

  const orgMembershipData = parentId
    ? invitees
        .filter((invitee) => invitee.needToCreateOrgMembership)
        .map((invitee) => ({
          createdAt,
          accepted,
          teamId: parentId,
          userId: invitee.id,
          role: MembershipRole.MEMBER,
        }))
    : [];

  // Use a transaction so team + org memberships are created atomically
  const { teamResult, orgResult } = await prisma.$transaction(async (tx) => {
    const teamResult = await tx.membership.createMany({
      data: teamMembershipData,
      skipDuplicates: true,
    });

    let orgResult = { count: 0 };
    if (orgMembershipData.length > 0) {
      orgResult = await tx.membership.createMany({
        data: orgMembershipData,
        skipDuplicates: true,
      });
    }

    return { teamResult, orgResult };
  });

  if (teamResult.count === 0 && teamMembershipData.length > 0) {
    throw new ErrorWithCode(ErrorCode.BadRequest, "user_already_invited_or_member");
  }

  const seatTracker = new SeatChangeTrackingService();
  const trackingPromises: Promise<void>[] = [];

  if (!parentId && teamResult.count > 0) {
    trackingPromises.push(
      seatTracker.logSeatAddition({
        teamId,
        seatCount: teamResult.count,
      })
    );
  }

  if (parentId && orgResult.count > 0) {
    trackingPromises.push(
      seatTracker.logSeatAddition({
        teamId: parentId,
        seatCount: orgResult.count,
      })
    );
  }

  await Promise.all(trackingPromises);
}
