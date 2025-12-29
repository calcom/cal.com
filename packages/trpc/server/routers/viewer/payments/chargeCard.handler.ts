import { handleNoShowFee } from "@calcom/features/bookings/lib/payment/handleNoShowFee";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { BookingAccessService } from "@calcom/features/bookings/services/BookingAccessService";
import type { PrismaClient } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TChargeCardInputSchema } from "./chargeCard.schema";

interface ChargeCardHandlerOptions {
  ctx: { user: NonNullable<TrpcSessionUser>; prisma: PrismaClient };
  input: TChargeCardInputSchema;
}
export const chargeCardHandler = async ({ ctx, input }: ChargeCardHandlerOptions) => {
  const { prisma, user } = ctx;

  const bookingAccessService = new BookingAccessService(prisma);
  const isAuthorized = await bookingAccessService.doesUserIdHaveAccessToBooking({
    userId: user.id,
    bookingId: input.bookingId,
  });

  if (!isAuthorized) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not authorized to charge this booking",
    });
  }

  const bookingRepository = new BookingRepository(prisma);
  const booking = await bookingRepository.getBookingForPaymentProcessing(input.bookingId);

  if (!booking) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Booking not found",
    });
  }

  if (booking.payment[0].success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The no show fee has already been charged",
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
      message: "Failed to charge no show fee",
    });
  }
};
