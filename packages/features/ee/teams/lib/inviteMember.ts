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
  teamOwnerLocale,
}: {
  teamId: number;
  teamName: string;
  inviter: string;
  pendingMember: PendingMember;
  teamOwnerLocale: string;
  teamSubscriptionActive?: boolean;
}) => {
  const translation = await getTranslation(pendingMember.locale || teamOwnerLocale || "en", "common");

  if (pendingMember.username && pendingMember.id) {
    const user = await prisma.membership.create({
      data: {
        teamId,
        userId: pendingMember.id,
        role: pendingMember.role as MembershipRole,
      },
    });

    const sendEmail = await sendTeamInviteEmail({
      language: translation,
      from: inviter,
      to: pendingMember.email,
      teamName,
      joinLink: WEBAPP_URL + `/settings/teams/${teamId}/members`,
    });
    // If user's are not on Cal.com
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
      to: pendingMember.email,
      teamName: teamName,
      joinLink: `${WEBAPP_URL}/signup?token=${token}&callbackUrl=/settings/teams`,
    });
  }
};
