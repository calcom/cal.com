import type { PrismaClient } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import { BookingRepository } from "../repositories/BookingRepository";
import { BookingAccessService } from "./BookingAccessService";

export class BookingDetailsService {
  private bookingRepo: BookingRepository;
  private bookingAccessService: BookingAccessService;

  constructor(prismaClient: PrismaClient) {
    this.bookingRepo = new BookingRepository(prismaClient);
    this.bookingAccessService = new BookingAccessService(prismaClient);
  }

  async getBookingDetails({ userId, bookingUid }: { userId: number; bookingUid: string }) {
    const hasAccess = await this.bookingAccessService.checkBookingAccessWithPBAC({
      userId,
      bookingUid,
    });

    if (!hasAccess) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to view this booking",
      });
    }

    const booking = await this.bookingRepo.findByUidForDetails({ bookingUid });

    if (!booking) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Booking not found",
      });
    }

    const [rescheduledToBooking, previousBooking] = await Promise.all([
      // For old rescheduled bookings, find the new booking
      booking.rescheduled
        ? this.bookingRepo.findRescheduledToBooking({ bookingUid: booking.uid })
        : Promise.resolve(null),
      // For new bookings that replaced an old one, fetch the previous booking's schedule
      booking.fromReschedule
        ? this.bookingRepo.findPreviousBooking({ fromReschedule: booking.fromReschedule })
        : Promise.resolve(null),
    ]);

    return {
      rescheduledToBooking,
      previousBooking,
    };
  }
}
