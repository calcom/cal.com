import { randomBytes } from "crypto";

import dayjs from "@calcom/dayjs";
import { prisma } from "@calcom/prisma";
import type { AccessScope } from "@calcom/prisma/enums";
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
  const { clientId, scopes, teamSlug, codeChallenge, codeChallengeMethod } = input;
  const client = await prisma.oAuthClient.findUnique({
    where: {
      clientId,
    },
    select: {
      clientId: true,
      redirectUri: true,
      name: true,
      clientType: true,
    },
  });

  if (!client) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Client ID not valid" });
  }

  if (client.clientType === "PUBLIC") {
    if (!codeChallenge) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "code_challenge required for public clients",
      });
    }
    if (!codeChallengeMethod || codeChallengeMethod !== "S256") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "code_challenge_method must be S256 for public clients",
      });
    }
  } else if (client.clientType === "CONFIDENTIAL") {
    // Optional PKCE validation for CONFIDENTIAL clients
    if (codeChallenge && (!codeChallengeMethod || codeChallengeMethod !== "S256")) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "code_challenge_method must be S256 when PKCE is used",
      });
    }
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
      scopes: scopes as [AccessScope],
      codeChallenge,
      codeChallengeMethod,
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
