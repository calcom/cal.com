import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { checkPremiumUsername } from "@calcom/ee/common/lib/checkPremiumUsername";
import { hashPasswordWithSalt } from "@calcom/features/auth/lib/hashPassword";
import { sendEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
import { createOrUpdateMemberships } from "@calcom/features/auth/signup/utils/createOrUpdateMemberships";
import { IS_PREMIUM_USERNAME_ENABLED, SIGNUP_URL } from "@calcom/lib/constants";
import { checkIfUserNameTaken, usernameSlugRandom } from "@calcom/lib/getName";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import logger from "@calcom/lib/logger";
import { sendUserToMakeWebhook } from "@calcom/lib/sendUserToWebhook";
import { isUsernameReservedDueToMigration } from "@calcom/lib/server/username";
import { validateAndGetCorrectedUsernameAndEmail } from "@calcom/lib/validateUsername";
import prisma from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";
import { signupSchema } from "@calcom/prisma/zod-utils";

import { prefillAvatar } from "../utils/prefillAvatar";
import {
  findTokenByToken,
  throwIfTokenExpired,
  validateAndGetCorrectedUsernameForTeam,
} from "../utils/token";

export default async function handler(body: Record<string, string>) {
  const { email, password, language, token } = signupSchema.parse(body);
  const { existingUserWithUsername, username: _username } = await checkIfUserNameTaken({
    username: body.username,
  });
  const username = existingUserWithUsername ? usernameSlugRandom(body.username) : _username;
  const userEmail = email.toLowerCase();

  if (!username) {
    return NextResponse.json({ message: "Invalid username" }, { status: 422 });
  }

  let foundToken: { id: number; calIdTeamId: number | null; expires: Date } | null = null;
  let correctedUsername = username;
  if (token) {
    foundToken = await findTokenByToken({ token });
    throwIfTokenExpired(foundToken?.expires);
    correctedUsername = await validateAndGetCorrectedUsernameForTeam({
      username,
      email: userEmail,
      teamId: foundToken?.calIdTeamId,
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

  const { hash, salt } = hashPasswordWithSalt(password);
  const utmParams = await extractUtmInfo();

  if (foundToken && foundToken?.calIdTeamId) {
    const team = await prisma.calIdTeam.findUnique({
      where: {
        id: foundToken.calIdTeamId,
      },
    });

    if (team) {
      // const isInviteForATeamInOrganization = !!team.parent;
      // const isCheckingUsernameInGlobalNamespace = !team.isOrganization && !isInviteForATeamInOrganization;
      const isCheckingUsernameInGlobalNamespace = true;
      if (isCheckingUsernameInGlobalNamespace) {
        const isUsernameAvailable = !(await isUsernameReservedDueToMigration(correctedUsername));
        if (!isUsernameAvailable) {
          return NextResponse.json({ message: "A user exists with that username" }, { status: 409 });
        }
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: userEmail },
        select: { metadata: true },
      });

      const mergedMetadata = {
        ...(isPrismaObjOrUndefined(existingUser?.metadata) ?? {}),
        ...(utmParams && { utm: utmParams }),
      };

      const user = await prisma.user.upsert({
        where: { email: userEmail },
        update: {
          username: correctedUsername,
          password: {
            upsert: {
              create: { hash, salt },
              update: { hash, salt },
            },
          },
          emailVerified: new Date(Date.now()),
          identityProvider: IdentityProvider.CAL,
          ...(utmParams && { metadata: mergedMetadata }),
        },
        create: {
          username: correctedUsername,
          email: userEmail,
          password: { create: { hash, salt } },
          identityProvider: IdentityProvider.CAL,
          ...(utmParams && { metadata: { utm: utmParams } }),
        },
      });

      const { membership } = await createOrUpdateMemberships({
        user,
        team,
      });

      // // Accept any child team invites for orgs.
      // if (team.parent) {
      //   await joinAnyChildTeamOnOrgInvite({
      //     userId: user.id,
      //     org: team.parent,
      //   });
      // }

      await sendUserToMakeWebhook({
        id: user.id,
        email: user.email,
        name: user.name ?? "N/A",
        username: user.username ?? "N/A",
        identityProvider: user.identityProvider,
      });
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
          { message: `Sign up from ${SIGNUP_URL} to claim your premium username` },
          { status: 422 }
        );
      }
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { metadata: true },
    });

    const mergedMetadata = {
      ...(isPrismaObjOrUndefined(existingUser?.metadata) ?? {}),
      ...(utmParams && { utm: utmParams }),
    };

    await prisma.user.upsert({
      where: { email: userEmail },
      update: {
        username: correctedUsername,
        password: {
          upsert: {
            create: { hash, salt },
            update: { hash, salt },
          },
        },
        emailVerified: new Date(Date.now()),
        identityProvider: IdentityProvider.CAL,
        ...(utmParams && { metadata: mergedMetadata }),
      },
      create: {
        username: correctedUsername,
        email: userEmail,
        password: { create: { hash, salt } },
        identityProvider: IdentityProvider.CAL,
        ...(utmParams && { metadata: { utm: utmParams } }),
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
async function extractUtmInfo() {
  const cookieStore = await cookies();
  const utmCookie = cookieStore.get("utm_params");
  return utmCookie ? JSON.parse(decodeURIComponent(utmCookie.value)) : null;
}
