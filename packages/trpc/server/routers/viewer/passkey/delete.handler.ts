import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TDeleteInputSchema } from "./delete.schema";

type deleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteInputSchema;
};
export const deleteHandler = async ({ ctx, input }: deleteOptions) => {
  try {
    await prisma.passkey.findFirstOrThrow({
      where: {
        id: input.passkeyId,
        userId: ctx.user.id,
      },
    });

    await prisma.passkey.delete({
      where: {
        id: input.passkeyId,
        userId: ctx.user.id,
      },
    });
  } catch (err) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Unable to delete this passkey. Please try again later.",
    });
  }
};
