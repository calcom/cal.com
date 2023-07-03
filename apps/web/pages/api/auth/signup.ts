import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { sendEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
import slugify from "@calcom/lib/slugify";
import { closeComUpsertTeamUser } from "@calcom/lib/sync/SyncServiceManager";
import prisma from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

const signupSchema = z.object({
  username: z.string(),
  email: z.string().email(),
  password: z.string().min(7),
  language: z.string().optional(),
  token: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return;
  }

  if (process.env.NEXT_PUBLIC_DISABLE_SIGNUP === "true") {
    res.status(403).json({ message: "Signup is disabled" });
    return;
  }

  const data = req.body;
  const { email, password, language, token } = signupSchema.parse(data);

  const username = slugify(data.username);
  const userEmail = email.toLowerCase();

  if (!username) {
    res.status(422).json({ message: "Invalid username" });
    return;
  }

  // There is an existingUser if the username matches
  // OR if the email matches AND either the email is verified
  // or both username and password are set
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { username },
        {
          AND: [
            { email: userEmail },
            {
              OR: [
                { emailVerified: { not: null } },
                {
                  AND: [{ password: { not: null } }, { username: { not: null } }],
                },
              ],
            },
          ],
        },
      ],
    },
  });

  if (existingUser) {
    const message: string =
      existingUser.email !== userEmail ? "Username already taken" : "Email address is already registered";

    return res.status(409).json({ message });
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {
      username,
      password: hashedPassword,
      emailVerified: new Date(Date.now()),
      identityProvider: IdentityProvider.CAL,
    },
    create: {
      username,
      email: userEmail,
      password: hashedPassword,
      identityProvider: IdentityProvider.CAL,
    },
  });

  if (token) {
    const foundToken = await prisma.verificationToken.findFirst({
      where: {
        token,
      },
    });

    if (!foundToken) {
      return res.status(401).json({ message: "Invalid Token" });
    }

    if (dayjs(foundToken?.expires).isBefore(dayjs())) {
      return res.status(401).json({ message: "Token expired" });
    }

    if (foundToken.teamId) {
      const team = await prisma.team.findUnique({
        where: {
          id: foundToken.teamId,
        },
      });

      if (team) {
        const teamMetadata = teamMetadataSchema.parse(team?.metadata);
        if (teamMetadata?.isOrganization) {
          await prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              organizationId: team.id,
            },
          });
        }

        const membership = await prisma.membership.update({
          where: {
            userId_teamId: { userId: user.id, teamId: team.id },
          },
          data: {
            accepted: true,
          },
        });
        closeComUpsertTeamUser(team, user, membership.role);

        // Accept any child team invites for orgs.
        if (team.parentId) {
          // Join ORG
          await prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              organizationId: team.parentId,
            },
          });

          /** We do a membership update twice so we can join the ORG invite if the user is invited to a team witin a ORG. */
          await prisma.membership.updateMany({
            where: {
              userId: user.id,
              team: {
                id: team.parentId,
              },
              accepted: false,
            },
            data: {
              accepted: true,
            },
          });

          // Join any other invites
          await prisma.membership.updateMany({
            where: {
              userId: user.id,
              team: {
                parentId: team.parentId,
              },
              accepted: false,
            },
            data: {
              accepted: true,
            },
          });
        }
      }
    }

    // Cleanup token after use
    await prisma.verificationToken.delete({
      where: {
        id: foundToken.id,
      },
    });
  }

  await sendEmailVerification({
    email: userEmail,
    username,
    language,
  });

  res.status(201).json({ message: "Created user" });
}
