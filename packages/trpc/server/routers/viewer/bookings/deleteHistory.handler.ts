import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";
import type { TDeleteInputSchema } from "./deleteHistory.schema";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteInputSchema;
};

export const deleteHistoryHandler = async ({ ctx: _ctx, input }: DeleteOptions) => {
  const { id } = input;

  await prisma.booking.delete({
    where: {
      id,
    },
  });

  await prisma.bookingSeat.deleteMany({
    where: {
      bookingId: id,
    },
  });

  await prisma.bookingReference.deleteMany({
    where: {
      bookingId: id,
    },
  });

  return {
    id,
  };
};
