import { PrismaClient } from "@prisma/client";

import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import { TCalidGetWhatsAppPhoneNumbersInput } from "./getWhatsAppPhoneNumbers.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TCalidGetWhatsAppPhoneNumbersInput;
};

export const getWhatsAppPhoneNumbersHandler = async ({ ctx, input }: GetOptions) => {
  const whereClause = input.credentialId
    ? { credentialId: input.credentialId }
    : input.calIdTeamId
    ? { credential: { calIdTeamId: input.calIdTeamId } }
    : { userId: ctx.user.id };

  const phones = await ctx.prisma.whatsAppBusinessPhone.findMany({
    where: whereClause,
    include: {
      credential: {
        select: {
          invalid: true,
        },
      },
    },
  });

  return phones.map((phone) => ({
    id: phone.phoneNumberId,
    phoneNumber: phone.phoneNumber,
    credentialId: phone.credentialId,
    wabaId: phone.wabaId,
    isDefault: false,
    isValid: !phone.credential.invalid,
    templates: phone.templates || [],
  }));
};
