import { generateRegistrationOptions } from "@simplewebauthn/server";
import { isoUint8Array } from "@simplewebauthn/server/helpers";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/types";
import { DateTime } from "luxon";

import { PASSKEY_TIMEOUT } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import { getAuthenticatorRegistrationOptions } from "./util";

type createRegistrationOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};
export const createRegistrationOptionsHandler = async ({ ctx }: createRegistrationOptions) => {
  try {
    const user = await prisma.user.findFirstOrThrow({
      where: {
        id: ctx.user.id,
      },
      select: {
        name: true,
        email: true,
        passkeys: true,
      },
    });
    const { passkeys } = user;
    const { rpName, rpId: rpID } = getAuthenticatorRegistrationOptions();
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: isoUint8Array.fromUTF8String(ctx.user.id.toString()),
      userName: user.email,
      userDisplayName: user.name ?? undefined,
      timeout: PASSKEY_TIMEOUT,
      attestationType: "none",
      excludeCredentials: passkeys.map((passkey) => ({
        id: passkey.credentialId.toString("utf8"),
        type: "public-key",
        transports: passkey.transports as AuthenticatorTransportFuture[],
      })),
    });

    await prisma.verificationToken.create({
      data: {
        userId: ctx.user.id,
        token: options.challenge,
        expires: DateTime.now().plus({ minutes: 2 }).toJSDate(),
        identifier: "PASSKEY_CHALLENGE",
      },
    });

    return options;
  } catch (err) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Unable to create the registration options for the passkey. Please try again later.",
    });
  }
};
