import { NextResponse } from "next/server";

import { checkPremiumUsername } from "@calcom/ee/common/lib/checkPremiumUsername";
import { sendEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
import { createOrUpdateMemberships } from "@calcom/features/auth/signup/utils/createOrUpdateMemberships";
import { validateAndGetCorrectedUsernameAndEmail } from "@calcom/features/auth/signup/utils/validateUsername";
import { hashPassword } from "@calcom/lib/auth/hashPassword";
import { IS_PREMIUM_USERNAME_ENABLED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { isUsernameReservedDueToMigration } from "@calcom/lib/server/username";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";
import { signupSchema } from "@calcom/prisma/zod-utils";

import { joinAnyChildTeamOnOrgInvite } from "../utils/organization";
import { prefillAvatar } from "../utils/prefillAvatar";
import {
  findTokenByToken,
  throwIfTokenExpired,
  validateAndGetCorrectedUsernameForTeam,
} from "../utils/token";

export default async function handler(body: Record<string, string>) {
  const { email, password, language, token } = signupSchema.parse(body);

  const username = slugify(body.username);
  const userEmail = email.toLowerCase();

  if (!username) {
    return NextResponse.json({ message: "Invalid username" }, { status: 422 });
  }

  let foundToken: { id: number; teamId: number | null; expires: Date } | null = null;
  let correctedUsername = username;
  if (token) {
    foundToken = await findTokenByToken({ token });
    throwIfTokenExpired(foundToken?.expires);
    correctedUsername = await validateAndGetCorrectedUsernameForTeam({
      username,
      email: userEmail,
      teamId: foundToken?.teamId,
      isSignup: true,
    });
  } else {
    const userValidation = await validateAndGetCorrectedUsernameAndEmail({
      username,
      email: userEmail,
      isSignup: true,
    });
    if (!userValidation.isValid) {
      logger.error("User validation failed", { userValidation });
      return NextResponse.json({ message: "Username or email is already taken" }, { status: 409 });
    }
    if (!userValidation.username) {
      return NextResponse.json({ message: "Invalid username" }, { status: 422 });
    }
    correctedUsername = userValidation.username;
  }

  const hashedPassword = await hashPassword(password);

  if (foundToken && foundToken?.teamId) {
    const team = await prisma.team.findUnique({
      where: {
        id: foundToken.teamId,
      },
      include: {
        parent: {
          select: {
            id: true,
            slug: true,
            organizationSettings: true,
          },
        },
        organizationSettings: true,
      },
    });

    if (team) {
      const isInviteForATeamInOrganization = !!team.parent;
      const isCheckingUsernameInGlobalNamespace = !team.isOrganization && !isInviteForATeamInOrganization;

      if (isCheckingUsernameInGlobalNamespace) {
        const isUsernameAvailable = !(await isUsernameReservedDueToMigration(correctedUsername));
        if (!isUsernameAvailable) {
          return NextResponse.json({ message: "A user exists with that username" }, { status: 409 });
        }
      }

      const organizationId = team.isOrganization ? team.id : team.parent?.id ?? null;
      const user = await prisma.user.upsert({
        where: { email: userEmail },
        update: {
          username: correctedUsername,
          password: {
            upsert: {
              create: { hash: hashedPassword },
              update: { hash: hashedPassword },
            },
          },
          emailVerified: new Date(Date.now()),
          identityProvider: IdentityProvider.CAL,
          organizationId,
        },
        create: {
          username: correctedUsername,
          email: userEmail,
          password: { create: { hash: hashedPassword } },
          identityProvider: IdentityProvider.CAL,
          organizationId,
        },
      });

      const { membership } = await createOrUpdateMemberships({
        user,
        team,
      });

      // Accept any child team invites for orgs.
      if (team.parent) {
        await joinAnyChildTeamOnOrgInvite({
          userId: user.id,
          org: team.parent,
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
    const isUsernameAvailable = !(await isUsernameReservedDueToMigration(correctedUsername));
    if (!isUsernameAvailable) {
      return NextResponse.json({ message: "A user exists with that username" }, { status: 409 });
    }
    if (IS_PREMIUM_USERNAME_ENABLED) {
      const checkUsername = await checkPremiumUsername(correctedUsername);
      if (checkUsername.premium) {
        return NextResponse.json(
          { message: "Sign up from https://cal.com/signup to claim your premium username" },
          { status: 422 }
        );
      }
    }
    await prisma.user.upsert({
      where: { email: userEmail },
      update: {
        username: correctedUsername,
        password: {
          upsert: {
            create: { hash: hashedPassword },
            update: { hash: hashedPassword },
          },
        },
        emailVerified: new Date(Date.now()),
        identityProvider: IdentityProvider.CAL,
      },
      create: {
        username: correctedUsername,
        email: userEmail,
        password: { create: { hash: hashedPassword } },
        identityProvider: IdentityProvider.CAL,
      },
    });

    if (process.env.AVATARAPI_USERNAME && process.env.AVATARAPI_PASSWORD) {
      await prefillAvatar({ email: userEmail });
    }

    await sendEmailVerification({
      email: userEmail,
      username: correctedUsername,
      language,
    });
  }

  return NextResponse.json({ message: "Created user" }, { status: 201 });
}
