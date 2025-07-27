import type { GetServerSidePropsContext, NextApiResponse } from "next";

import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { checkRegularUsername } from "@calcom/lib/server/checkRegularUsername";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TAddUsernameAliasInputSchema } from "./addUsernameAlias.schema";

type AddUsernameAliasOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    res?: NextApiResponse | GetServerSidePropsContext["res"];
  };
  input: TAddUsernameAliasInputSchema;
};

export const addUsernameAliasHandler = async ({ ctx, input }: AddUsernameAliasOptions) => {
  const { user } = ctx;

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `addUsernameAlias.${user.username}`,
  });

  // Check if the username is available
  const usernameCheckResult = await checkRegularUsername(input.username, null);

  if (!usernameCheckResult.available) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Username already taken" });
  }

  // Check if the user already has this alias
  const existingAlias = await prisma.usernameAlias.findFirst({
    where: {
      username: input.username,
      userId: user.id,
    },
  });

  if (existingAlias) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "You already have this username alias" });
  }

  const updatedData = await prisma.usernameAlias.create({
    data: { ...input, userId: user.id },
  });

  return {
    data: updatedData,
    message: "Username alias added successfully",
  };
};
