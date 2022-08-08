import { MembershipRole } from "@prisma/client";
import { randomBytes } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";

import { sendTeamInviteEmail } from "@calcom/emails";
import prisma from "@calcom/prisma";

import { getSession } from "@lib/auth";
import { BASE_URL } from "@lib/config/constants";
import slugify from "@lib/slugify";

import { getTranslation } from "@server/lib/i18n";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const t = await getTranslation(req.body.language ?? "en", "common");

  if (req.method !== "POST") {
    return res.status(400).json({ message: "Bad request" });
  }

  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const team = await prisma.team.findFirst({
    where: {
      id: parseInt(req.query.team as string),
    },
  });

  if (!team) {
    return res.status(404).json({ message: "Invalid team" });
  }

  const reqBody = req.body as {
    usernameOrEmail: string;
    role: MembershipRole;
    sendEmailInvitation: boolean;
  };
  const { role, sendEmailInvitation } = reqBody;
  // liberal email match
  const isEmail = (str: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
  const usernameOrEmail = isEmail(reqBody.usernameOrEmail)
    ? reqBody.usernameOrEmail.toLowerCase()
    : slugify(reqBody.usernameOrEmail);

  const invitee = await prisma.user.findFirst({
    where: {
      OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    },
  });

  if (!invitee) {
    const email = isEmail(usernameOrEmail) ? usernameOrEmail : undefined;
    if (!email) {
      return res.status(400).json({
        message: `Invite failed because there is no corresponding user for ${usernameOrEmail}`,
      });
    }
    await prisma.user.create({
      data: {
        email,
        teams: {
          create: {
            team: {
              connect: {
                id: parseInt(req.query.team as string),
              },
            },
            role,
          },
        },
      },
    });

    const token: string = randomBytes(32).toString("hex");

    await prisma.verificationToken.create({
      data: {
        identifier: usernameOrEmail,
        token,
        expires: new Date(new Date().setHours(168)), // +1 week
      },
    });

    if (session?.user?.name && team?.name) {
      await sendTeamInviteEmail({
        language: t,
        from: session.user.name,
        to: usernameOrEmail,
        teamName: team.name,
        joinLink: `${BASE_URL}/auth/signup?token=${token}&callbackUrl=/settings/teams}`,
      });
    }

    return res.status(201).json({});
  }

  // create provisional membership
  try {
    await prisma.membership.create({
      data: {
        teamId: parseInt(req.query.team as string),
        userId: invitee.id,
        role,
      },
    });
  } catch (err: any) {
    if (err.code === "P2002") {
      // unique constraint violation
      return res.status(409).json({
        message: "This user is a member of this team / has a pending invitation.",
      });
    } else {
      throw err; // rethrow
    }
  }

  // inform user of membership by email
  if (sendEmailInvitation && session?.user?.name && team?.name) {
    await sendTeamInviteEmail({
      language: t,
      from: session.user.name,
      to: usernameOrEmail,
      teamName: team.name,
      joinLink: BASE_URL + "/settings/teams",
    });
  }

  res.status(201).json({});
}
