import { MembershipRole } from "@prisma/client";
import { randomBytes } from "crypto";

import { sendTeamInviteEmail } from "@calcom/emails";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";

import { PendingMember } from "./types";

export const createMember = async ({
  teamId,
  teamName,
  inviter,
  pendingMember,
  language,
  teamSubscriptionActive,
}): {
  teamId: number;
  teamName: string;
  pendingMember: PendingMember;
  language: string;
  teamSubscriptionActive?: boolean;
} => {
  if (pendingMember.username) {
    await prisma.membership.create({
      data: {
        teamId,
        userId: pendingMember.userId,
        role: pendingMember.role as MembershipRole,
      },
    });
    console.log(pendingMember);
    // If user's are not on Cal.com
  } else {
    // Check if user is already in DB
    const user = await prisma.user.findUnique({
      where: {
        email: pendingMember.email,
      },
      select: {
        id: true,
      },
    });
    if (user) {
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          teams: {
            create: {
              teamId: teamId,
              role: pendingMember.role as MembershipRole,
            },
          },
        },
      });
    } else {
      // If user is not in DB
      const createdMember = await prisma.user.create({
        data: {
          email: pendingMember.email,
          invitedTo: teamId,
          teams: {
            create: {
              teamId: teamId,
              role: pendingMember.role as MembershipRole,
            },
          },
        },
      });
    }
  }
};

export const sendTeamInvite = async ({ member, inviter, teamOwnerLocale, teamId, teamName }) => {
  if (member.role === "OWNER") return;

  const translation = await getTranslation(member.locale || teamOwnerLocale || "en", "common");

  if (member.username) {
    await sendTeamInviteEmail({
      language: translation,
      from: inviter,
      to: member.email,
      teamName,
      joinLink: WEBAPP_URL + `/settings/teams/${teamId}/members`,
    });
    // Send an invite with a signup link if not a user
  } else {
    const token: string = randomBytes(32).toString("hex");

    await prisma.verificationToken.create({
      data: {
        identifier: pendingMember.email,
        token,
        expires: new Date(new Date().setHours(168)), // +1 week
      },
    });

    await sendTeamInviteEmail({
      language: translation,
      from: inviter,
      to: member.email,
      teamName: teamName,
      joinLink: `${WEBAPP_URL}/signup?token=${token}&callbackUrl=/settings/teams`,
    });
  }

  console.log("🚀 ~ file: inviteMember.ts ~ line 100 ~ sendTeamInvite ~ member", member);
};
