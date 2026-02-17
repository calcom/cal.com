import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { TCreateCustomReasonSchema } from "./outOfOfficeCreateReason.schema";

type CreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateCustomReasonSchema;
};

export const outOfOfficeCreateReason = async ({ ctx, input }: CreateOptions) => {
  const t = await getTranslation("en", "common");
  
  try {
    const existingReason = await prisma.outOfOfficeReason.findFirst({
      where: {
        userId: ctx.user.id,
        reason: input.reason,
      },
    });

    if (existingReason) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "You already have a custom reason with this text",
      });
    }

    const systemDefaults = await prisma.outOfOfficeReason.findMany({
      where: {
        userId: null,
      },
    });


    const inputReasonLower = input.reason.toLowerCase();
    const isSystemDefault = systemDefaults.some((defaultReason) => {
      const translatedReason = t(defaultReason.reason);
      return translatedReason.toLowerCase() === inputReasonLower;
    });

    if (isSystemDefault) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This reason already exists as a system default",
      });
    }

    const customReason = await prisma.outOfOfficeReason.create({
      data: {
        emoji: input.emoji,
        reason: input.reason,
        userId: ctx.user.id,
        enabled: true,
      },
    });

    return customReason;
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create custom out-of-office reason",
      cause: error,
    });
  }
};