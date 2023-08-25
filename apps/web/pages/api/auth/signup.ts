import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { sendEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
import slugify from "@calcom/lib/slugify";
import { closeComUpsertTeamUser } from "@calcom/lib/sync/SyncServiceManager";
import { validateUsernameInOrg } from "@calcom/lib/validateUsernameInOrg";
import prisma from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

const signupSchema = z.object({
  username: z.string().refine((value) => !value.includes("+"), {
    message: "String should not contain a plus symbol (+).",
  }),
  email: z.string().email(),
  password: z.string().min(7),
  language: z.string().optional(),
  token: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" }); // Return 405 for unsupported methods
    return;
  }

  if (process.env.NEXT_PUBLIC_DISABLE_SIGNUP === "true") {
    res.status(403).json({ message: "Signup is disabled" });
    return;
  }

  const data = req.body;
  try {
    const { email, password, language, token } = signupSchema.parse(data);

    const username = slugify(data.username);
    const userEmail = email.toLowerCase();

    if (!username) {
      res.status(422).json({ message: "Invalid username" });
      return;
    }

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
      res.status(409).json({ message });
      return;
    }

    let foundToken: { id: number; teamId: number | null; expires: Date } | null = null;
    if (token) {
      foundToken = await prisma.verificationToken.findFirst({
        where: {
          token,
        },
        select: {
          id: true,
          expires: true,
          teamId: true,
        },
      });

      if (!foundToken) {
        res.status(401).json({ message: "Invalid Token" });
        return;
      }

      if (dayjs(foundToken?.expires).isBefore(dayjs())) {
        res.status(401).json({ message: "Token expired" });
        return;
      }

      if (foundToken?.teamId) {
        const isValidUsername = await validateUsernameInOrg(username, foundToken?.teamId);

        if (!isValidUsername) {
          res.status(409).json({ message: "Username already taken" });
          return;
        }
      }
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

    if (foundToken && foundToken?.teamId) {
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

        if (team.parentId) {
          await prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              organizationId: team.parentId,
            },
          });

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
  } catch (error) {
    console.error("Error processing signup:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
