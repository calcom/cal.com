import { handleNoShowFee } from "@calcom/features/bookings/lib/payment/handleNoShowFee";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { BookingAccessService } from "@calcom/features/bookings/services/BookingAccessService";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
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
      code: "FORBIDDEN",
      message: "You are not authorized to charge this booking",
    });
  }

  const bookingRepository = new BookingRepository(prisma);
  const booking = await bookingRepository.getBookingForPaymentProcessing(input.bookingId);

  // Race condition guard: booking deleted between access check and fetch.
  if (!booking) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Booking ${input.bookingId} not found after authorization` });
  }

  const payment = booking.payment[0];
  if (!payment) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `No payment found for booking ${booking.id}`,
    });
  }

  if (payment.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `The no show fee for booking ${booking.id} has already been charged`,
    });
  }

  try {
    await handleNoShowFee({
      booking,
      payment,
    });
  } catch (error) {
    console.error(error);

    if (error instanceof ErrorWithCode && error.code === ErrorCode.ChargeCardFailure) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: error.message,
      });
    }

    if (error instanceof Error) {
      const message = error.message;

      if (message.includes("User is not a member of the team")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message,
        });
      }

      if (message.includes("User ID is required") || message.includes("No payment credential found")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message,
        });
      }
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to charge no show fee for booking ${booking.id}`,
    });
  }
};
