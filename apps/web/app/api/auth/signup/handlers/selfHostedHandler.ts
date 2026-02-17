import { NextResponse } from "next/server";

import { checkPremiumUsername } from "@calcom/ee/common/lib/checkPremiumUsername";
import { sendEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
import { createOrUpdateMemberships } from "@calcom/features/auth/signup/utils/createOrUpdateMemberships";
import { validateAndGetCorrectedUsernameAndEmail } from "@calcom/features/auth/signup/utils/validateUsername";
import { hashPassword } from "@calcom/lib/auth/hashPassword";
import { IS_PREMIUM_USERNAME_ENABLED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { isPrismaError } from "@calcom/lib/server/getServerErrorFromUnknown";
import { isUsernameReservedDueToMigration } from "@calcom/lib/server/username";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";
import { signupSchema } from "@calcom/prisma/zod-utils";

import { joinAnyChildTeamOnOrgInvite } from "@calcom/features/auth/signup/utils/organization";
import { prefillAvatar } from "@calcom/features/auth/signup/utils/prefillAvatar";
import { SIGNUP_ERROR_CODES } from "@calcom/features/auth/signup/constants";
import {
  findTokenByToken,
  throwIfTokenExpired,
  validateAndGetCorrectedUsernameForTeam,
} from "@calcom/features/auth/signup/utils/token";

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

    if (foundToken?.teamId) {
      const existingUser = await prisma.user.findUnique({
        where: { email: userEmail },
        select: { invitedTo: true },
      });
      if (existingUser && existingUser.invitedTo !== foundToken.teamId) {
        return NextResponse.json({ message: SIGNUP_ERROR_CODES.USER_ALREADY_EXISTS }, { status: 409 });
      }
    }
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

      const organizationId = team.isOrganization ? team.id : (team.parent?.id ?? null);

      const existingUserByUsername = await prisma.user.findFirst({
        where: {
          username: correctedUsername,
          organizationId,
          NOT: { email: userEmail },
        },
        select: { id: true },
      });
      if (existingUserByUsername) {
        return NextResponse.json({ message: SIGNUP_ERROR_CODES.USER_ALREADY_EXISTS }, { status: 409 });
      }

      let user: { id: number };
      try {
        user = await prisma.user.upsert({
          where: { email: userEmail },
          update: {
            username: correctedUsername,
            emailVerified: new Date(Date.now()),
            identityProvider: IdentityProvider.CAL,
            password: {
              upsert: {
                create: { hash: hashedPassword },
                update: { hash: hashedPassword },
              },
            },
            organizationId,
          },
          create: {
            username: correctedUsername,
            email: userEmail,
            emailVerified: new Date(Date.now()),
            identityProvider: IdentityProvider.CAL,
            password: { create: { hash: hashedPassword } },
            organizationId,
          },
          select: { id: true },
        });
      } catch (error) {
        if (isPrismaError(error) && error.code === "P2002") {
          const target = String(error.meta?.target ?? "");
          if (target.includes("email") || target.includes("username")) {
            return NextResponse.json({ message: SIGNUP_ERROR_CODES.USER_ALREADY_EXISTS }, { status: 409 });
          }
        }
        throw error;
      }

      await createOrUpdateMemberships({
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

    try {
      await prisma.user.create({
        data: {
          username: correctedUsername,
          email: userEmail,
          password: { create: { hash: hashedPassword } },
          identityProvider: IdentityProvider.CAL,
        },
        select: { id: true },
      });
    } catch (error) {
      // Fallback for race conditions where user was created between our check and create
      if (isPrismaError(error) && error.code === "P2002") {
        const target = String(error.meta?.target ?? "");
        if (target.includes("email") || target.includes("username")) {
          return NextResponse.json({ message: SIGNUP_ERROR_CODES.USER_ALREADY_EXISTS }, { status: 409 });
        }
      }
      throw error;
    }

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
