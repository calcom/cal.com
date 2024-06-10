import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TUpdateInputSchema } from "./update.schema";

type updateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateInputSchema;
};
export const updateHandler = async ({ ctx, input }: updateOptions) => {
  try {
    const passkey = await prisma.passkey.findFirstOrThrow({
      where: {
        id: input.passkeyId,
        userId: ctx.user.id,
      },
    });

    if (passkey.name === input.name) {
      return;
    }

    await prisma.passkey.update({
      where: {
        id: input.passkeyId,
        userId: ctx.user.id,
      },
      data: {
        name: input.name,
        updatedAt: new Date(),
      },
    });
  } catch (err) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Unable to update this passkey. Please try again later.",
    });
  }
};
