import { handleNoShowFee } from "@calcom/features/bookings/lib/payment/handleNoShowFee";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { PrismaClient } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TChargeCardInputSchema } from "./chargeCard.schema";

interface ChargeCardHandlerOptions {
  ctx: { user: NonNullable<TrpcSessionUser>; prisma: PrismaClient };
  input: TChargeCardInputSchema;
}
export const chargeCardHandler = async ({ ctx, input }: ChargeCardHandlerOptions) => {
  const { prisma } = ctx;
  const bookingRepository = new BookingRepository(prisma);

  const booking = await bookingRepository.getBookingForPaymentProcessing(input.bookingId);

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.payment[0].success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `The no show fee for ${booking.id} has already been charged.`,
    });
  }

  try {
    await handleNoShowFee({
      booking,
      payment: booking.payment[0],
    });
  } catch (error) {
    console.error(error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to charge no show fee for ${booking.id}`,
    });
  }
};
