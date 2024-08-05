import { verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";

import { MAXIMUM_PASSKEYS } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TCreateInputSchema } from "./create.schema";
import { getAuthenticatorRegistrationOptions } from "./util";

type createOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateInputSchema;
};
export const createHandler = async ({ ctx, input }: createOptions) => {
  const { passkeyName, verificationResponse } = input;
  const { _count } = await prisma.user.findFirstOrThrow({
    where: {
      id: ctx.user.id,
    },
    include: {
      _count: {
        select: {
          passkeys: true,
        },
      },
    },
  });

  if (_count.passkeys >= MAXIMUM_PASSKEYS) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "TOO_MANY_PASSKEYS",
    });
  }
  const verificationToken = await prisma.verificationToken.findFirst({
    where: {
      userId: ctx.user.id,
      identifier: "PASSKEY_CHALLENGE",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!verificationToken) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Challenge token not found",
    });
  }

  await prisma.verificationToken.deleteMany({
    where: {
      userId: ctx.user.id,
      identifier: "PASSKEY_CHALLENGE",
    },
  });

  if (verificationToken.expires < new Date()) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Challenge token expired",
    });
  }

  const { rpId: expectedRPID, origin: expectedOrigin } = getAuthenticatorRegistrationOptions();

  const verification = await verifyRegistrationResponse({
    response: verificationResponse as RegistrationResponseJSON,
    expectedChallenge: verificationToken.token,
    expectedOrigin,
    expectedRPID,
  });
  if (!verification.verified || !verification.registrationInfo) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Verification failed",
    });
  }
  const { credentialPublicKey, credentialID, counter, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo;

  await prisma.passkey.create({
    data: {
      userId: ctx.user.id,
      name: passkeyName,
      credentialId: Buffer.from(credentialID),
      credentialPublicKey: Buffer.from(credentialPublicKey),
      counter,
      credentialDeviceType,
      credentialBackedUp,
      transports: verificationResponse.response.transports,
    },
  });
};
