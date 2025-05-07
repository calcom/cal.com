import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class BookingReferencesRepository_2024_08_13 {
  constructor(private readonly dbRead: PrismaReadService) {}

  async getBookingReferences(bookingId: number) {
    return this.dbRead.prisma.bookingReference.findMany({
      where: {
        bookingId,
      },
      select: {
        type: true,
        uid: true,
        id: true,
      },
    });
  }
}
