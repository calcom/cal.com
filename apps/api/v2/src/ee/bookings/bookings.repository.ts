import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class BookingsRepository {
  constructor(private readonly dbRead: PrismaReadService) {}

  async getBookingsByUserId(userId: number) {
    // return the last 50 bookings of user associated with access token
    const bookings = await this.dbRead.prisma.booking.findMany({
      where: {
        userId,
      },
      orderBy: {
        id: "desc",
      },
      take: 50,
    });

    return bookings;
  }

  async getBookingsById(bookingId: number) {
    // get booking by ID of user associated with access token
    const booking = await this.dbRead.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    return booking;
  }
}
