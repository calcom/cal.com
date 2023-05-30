import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { sendEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
import slugify from "@calcom/lib/slugify";
import { closeComUpsertTeamUser } from "@calcom/lib/sync/SyncServiceManager";
import prisma from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";

const signupSchema = z.object({
  username: z.string(),
  email: z.string().email(),
  password: z.string().min(7),
  language: z.string().optional(),
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
  const { email, password, language } = signupSchema.parse(data);

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

  // If user has been invitedTo a team, we accept the membership
  if (user.invitedTo) {
    const team = await prisma.team.findFirst({
      where: { id: user.invitedTo },
    });

    if (team) {
      const membership = await prisma.membership.update({
        where: {
          userId_teamId: { userId: user.id, teamId: user.invitedTo },
        },
        data: {
          accepted: true,
        },
      });

      // Sync Services: Close.com
      closeComUpsertTeamUser(team, user, membership.role);
    }
  }

  await sendEmailVerification({
    email: userEmail,
    username,
    language,
  });

  res.status(201).json({ message: "Created user" });
}
