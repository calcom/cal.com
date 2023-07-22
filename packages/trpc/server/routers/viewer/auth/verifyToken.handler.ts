import dayjs from "@calcom/dayjs";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TVerifyTokenSchema } from "./verifyToken.schema";

type VerifyTokenOptions = {
  input: TVerifyTokenSchema;
};

export const verifyTokenHandler = async ({ input }: VerifyTokenOptions) => {
    const { token, identifier } = input
    const foundToken = await prisma.verificationToken.findFirst({
        where: {
            token,
            identifier
        },
    });

    if (!foundToken) {
        throw new TRPCError({code: "NOT_FOUND"})
    }

    if (dayjs(foundToken?.expires).isBefore(dayjs())) {
        throw new TRPCError({code: "UNAUTHORIZED"})
    }

    // Delete token from DB after it has been used
    await prisma.verificationToken.delete({
        where: {
            id: foundToken?.id,
        },
    });

  return {ok: true};
};
