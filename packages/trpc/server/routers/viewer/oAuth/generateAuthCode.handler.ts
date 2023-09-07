import { randomBytes } from "crypto";

import dayjs from "@calcom/dayjs";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TGenerateAuthCodeInputSchema } from "./generateAuthCode.schema";

type AddClientOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGenerateAuthCodeInputSchema;
};

export const generateAuthCodeHandler = async ({ ctx, input }: AddClientOptions) => {
  const { clientId } = input;

  const client = await prisma.oAuthClient.findFirst({
    where: {
      clientId,
    },
    select: {
      clientId: true,
      redirectUri: true,
      name: true,
    },
  });

  if (!client) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Client ID not valid" });
  }
  const authorizationCode = generateAuthorizationCode();

  // a user can only have one active access code per client (unique constraint)
  await prisma.accessCode.deleteMany({
    where: {
      clientId,
      userId: ctx.user.id,
    },
  });

  await prisma.accessCode.create({
    data: {
      code: authorizationCode,
      clientId,
      userId: ctx.user.id,
      expiresAt: dayjs().add(10, "minutes").toDate(),
    },
  });
  return { client, authorizationCode };
};

function generateAuthorizationCode() {
  const randomBytesValue = randomBytes(40);
  const authorizationCode = randomBytesValue
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return authorizationCode;
}
