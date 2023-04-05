import type { Prisma } from "@prisma/client";

import { TRPCError } from "@trpc/server";

import type { TRPCEndpointOptions } from "../../../trpc";
import type { updateAppCredentialsSchema } from "./schemas/updateAppCredentialsSchema";

export const updateAppCredentials = async ({
  ctx,
  input,
}: TRPCEndpointOptions<typeof updateAppCredentialsSchema>) => {
  const { user } = ctx;

  const { key } = input;

  // Find user credential
  const credential = await ctx.prisma.credential.findFirst({
    where: {
      id: input.credentialId,
      userId: user.id,
    },
  });
  // Check if credential exists
  if (!credential) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Could not find credential ${input.credentialId}`,
    });
  }

  const updated = await ctx.prisma.credential.update({
    where: {
      id: credential.id,
    },
    data: {
      key: {
        ...(credential.key as Prisma.JsonObject),
        ...(key as Prisma.JsonObject),
      },
    },
  });

  return !!updated;
};
