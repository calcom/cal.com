import { randomBytes } from "crypto";

import dayjs from "@calcom/dayjs";
import { parseAndValidateScopesForClient } from "@calcom/features/auth/lib/scopeValidator";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TGenerateAuthCodeInputSchema } from "./generateAuthCode.schema";

type AddClientOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGenerateAuthCodeInputSchema;
};

export const generateAuthCodeHandler = async ({ ctx, input }: AddClientOptions) => {
  const { clientId, scopes, teamSlug } = input;

  const validationResult = await parseAndValidateScopesForClient(scopes, clientId, { allowEmpty: false });
  if (!validationResult.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: validationResult.error,
    });
  }

  const client = await prisma.oAuthClient.findUnique({
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

  const team = teamSlug
    ? await prisma.team.findFirst({
        where: {
          slug: teamSlug,
          members: {
            some: {
              userId: ctx.user.id,
              role: {
                in: ["OWNER", "ADMIN"],
              },
            },
          },
        },
      })
    : undefined;

  if (teamSlug && !team) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  await prisma.accessCode.create({
    data: {
      code: authorizationCode,
      clientId,
      userId: !teamSlug ? ctx.user.id : undefined,
      teamId: team ? team.id : undefined,
      expiresAt: dayjs().add(10, "minutes").toDate(),
      scopes: validationResult.scopes,
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
