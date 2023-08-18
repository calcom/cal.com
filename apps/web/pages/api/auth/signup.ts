import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { checkPremiumUsername } from "@calcom/ee/common/lib/checkPremiumUsername";
import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { sendEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
import { IS_CALCOM } from "@calcom/lib/constants";
import slugify from "@calcom/lib/slugify";
import { closeComUpsertTeamUser } from "@calcom/lib/sync/SyncServiceManager";
import { validateUsernameInTeam, validateUsername } from "@calcom/lib/validateUsername";
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
    return res.status(405).end();
  }

  if (process.env.NEXT_PUBLIC_DISABLE_SIGNUP === "true") {
    res.status(403).json({ message: "Signup is disabled" });
    return;
  }

  const data = req.body;
  const { email, password, language, token } = signupSchema.parse(data);

  const username = slugify(data.username);
  const userEmail = email.toLowerCase();

  const validationResponse = (
    incomingEmail: string,
    validation: { isValid: boolean; email: string | undefined }
  ) => {
    const { isValid, email } = validation;
    if (!isValid) {
      const message: string =
        email !== incomingEmail ? "Username already taken" : "Email address is already registered";

      return res.status(409).json({ message });
    }
  };

  if (!username) {
    res.status(422).json({ message: "Invalid username" });
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
      return res.status(401).json({ message: "Invalid Token" });
    }

    if (dayjs(foundToken?.expires).isBefore(dayjs())) {
      return res.status(401).json({ message: "Token expired" });
    }
    if (foundToken?.teamId) {
      const teamUserValidation = await validateUsernameInTeam(username, userEmail, foundToken?.teamId);
      return validationResponse(userEmail, teamUserValidation);
    }
  } else {
    const userValidation = await validateUsername(username, userEmail);
    return validationResponse(userEmail, userValidation);
  }

  const hashedPassword = await hashPassword(password);

  if (foundToken && foundToken?.teamId) {
    const team = await prisma.team.findUnique({
      where: {
        id: foundToken.teamId,
      },
    });

    if (team) {
      const teamMetadata = teamMetadataSchema.parse(team?.metadata);

      if (IS_CALCOM && (!teamMetadata?.isOrganization || !!team.parentId)) {
        const checkUsername = await checkPremiumUsername(username);
        if (checkUsername.premium) {
          // This signup page is ONLY meant for team invites and local setup. Not for every day users.
          // In singup redesign/refactor coming up @sean will tackle this to make them the same API/page instead of two.
          return res.status(422).json({
            message: "Sign up from https://cal.com/signup to claim your premium username",
          });
        }
      }

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

    // Cleanup token after use
    await prisma.verificationToken.delete({
      where: {
        id: foundToken.id,
      },
    });
  } else {
    if (IS_CALCOM) {
      const checkUsername = await checkPremiumUsername(username);
      if (checkUsername.premium) {
        res.status(422).json({
          message: "Sign up from https://cal.com/signup to claim your premium username",
        });
        return;
      }
    }
    await prisma.user.upsert({
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
    await sendEmailVerification({
      email: userEmail,
      username,
      language,
    });
  }

  res.status(201).json({ message: "Created user" });
}
