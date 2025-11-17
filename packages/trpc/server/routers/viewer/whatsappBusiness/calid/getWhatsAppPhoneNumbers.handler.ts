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

const calid_getWhatsAppPhoneNumbersHandler = async ({ ctx, input }: GetOptions) => {
  const whereClause = input.calIdTeamId
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

  console.log("Fetched phones:", phones);

  return phones.map((phone) => ({
    id: phone.phoneNumberId,
    phoneNumber: phone.phoneNumber,
    wabaId: phone.wabaId,
    isDefault: false, // Logic to determine default can be added
    isValid: !phone.credential.invalid,
  }));
};

export default calid_getWhatsAppPhoneNumbersHandler;
