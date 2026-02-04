import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { checkPremiumUsername } from "@calcom/ee/common/lib/checkPremiumUsername";
import { hashPasswordWithSalt } from "@calcom/features/auth/lib/hashPassword";
import { sendEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
import { createOrUpdateMemberships } from "@calcom/features/auth/signup/utils/createOrUpdateMemberships";
import { IS_PREMIUM_USERNAME_ENABLED, SIGNUP_URL } from "@calcom/lib/constants";
import { sanitizeDeviceString } from "@calcom/lib/deviceDetection";
import getIP from "@calcom/lib/getIP";
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

export default async function handler(body: Record<string, string>, request?: Request) {
  const { email, password, language, token, deviceDetails } = signupSchema.parse(body);
  //checks if a user with the given username already exists
  const { existingUserWithUsername, username: _username } = await checkIfUserNameTaken({
    username: body.username,
  });
  // if username already taken, proceed with randomizing the input username
  const username = existingUserWithUsername ? usernameSlugRandom(body.username) : _username;
  const userEmail = email.toLowerCase();

  if (!username) {
    return NextResponse.json({ message: "Invalid username" }, { status: 422 });
  }

  let foundToken: { id: number; calIdTeamId: number | null; expires: Date } | null = null;
  let correctedUsername = username;
  if (token) {
    //if token passed, retrieve the token details or else throw in case of invalid token
    foundToken = await findTokenByToken({ token });
    //throwing unauthorized error if token expired
    throwIfTokenExpired(foundToken?.expires);

    //allows user if unique or if already invited to the team, else throws error
    correctedUsername = await validateAndGetCorrectedUsernameForTeam({
      username,
      email: userEmail,
      teamId: foundToken?.calIdTeamId,
      isSignup: true,
    });
  } else {
    //allows user if unique , else throws error
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

  //create password for the user being created
  const { hash, salt } = hashPasswordWithSalt(password);
  // extract utm info for user tracking
  const utmParams = await extractUtmInfo();

  // Safely process device details with IP
  let processedDeviceDetails = null;
  if (deviceDetails && request) {
    try {
      const ip = getIP(request);
      processedDeviceDetails = {
        ip: ip || "Unknown",
        browser: sanitizeDeviceString(deviceDetails.browser),
        deviceType: deviceDetails.deviceType,
        deviceOS: sanitizeDeviceString(deviceDetails.deviceOS),
        screenResolution: sanitizeDeviceString(deviceDetails.screenResolution),
      };
    } catch (error) {
      console.warn("Failed to process device details:", error);
    }
  }

  // Common username validation
  const isUsernameAvailable = !(await isUsernameReservedDueToMigration(correctedUsername));
  if (!isUsernameAvailable) {
    return NextResponse.json({ message: "A user exists with that username" }, { status: 409 });
  }

  // Team-specific logic
  let team = null;
  if (foundToken && foundToken?.calIdTeamId) {
    team = await prisma.calIdTeam.findUnique({
      where: { id: foundToken.calIdTeamId },
    });
  }

  // Non-team-specific validations
  if (!team && IS_PREMIUM_USERNAME_ENABLED) {
    const checkUsername = await checkPremiumUsername(correctedUsername);
    if (checkUsername.premium) {
      return NextResponse.json(
        { message: `Sign up from ${SIGNUP_URL} to claim your premium username` },
        { status: 422 }
      );
    }
  }

  // Common user upsert logic
  const existingUser = await prisma.user.findUnique({
    where: { email: userEmail },
    select: { metadata: true },
  });

  const mergedMetadata = {
    ...(isPrismaObjOrUndefined(existingUser?.metadata) ?? {}),
    ...(utmParams && { utm: utmParams }),
    ...(processedDeviceDetails && { deviceDetails: processedDeviceDetails }),
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
      ...(utmParams || processedDeviceDetails ? { metadata: mergedMetadata } : {}),
    },
    create: {
      username: correctedUsername,
      email: userEmail,
      password: { create: { hash, salt } },
      identityProvider: IdentityProvider.CAL,
      ...(utmParams || processedDeviceDetails ? { metadata: mergedMetadata } : {}),
    },
  });

  // Team-specific post-processing
  if (team) {
    await createOrUpdateMemberships({ user, team });
    await sendUserToMakeWebhook({
      id: user.id,
      email: user.email,
      name: user.name ?? "N/A",
      username: user.username ?? "N/A",
      identityProvider: user.identityProvider,
    });
  }

  // Non-team post-processing
  if (!team) {
    if (process.env.AVATARAPI_USERNAME && process.env.AVATARAPI_PASSWORD) {
      await prefillAvatar({ email: userEmail });
    }
    await sendEmailVerification({
      email: userEmail,
      username: correctedUsername,
      language,
    });
  }

  // Cleanup token if it exists
  if (foundToken) {
    await prisma.verificationToken.delete({
      where: { id: foundToken.id },
    });
  }

  return NextResponse.json({ message: "Created user" }, { status: 201 });
}
async function extractUtmInfo() {
  const cookieStore = await cookies();
  const utmCookie = cookieStore.get("utm_params");
  return utmCookie ? JSON.parse(decodeURIComponent(utmCookie.value)) : null;
}
