import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import type { Prisma } from "@calcom/prisma/client";

@Injectable()
export class BookingAttendeesRepository_2024_08_13 {
  constructor(private readonly dbWrite: PrismaWriteService) {}

  async addAttendeesToBooking(
    bookingUid: string,
    attendeesToAdd: Prisma.AttendeeCreateWithoutBookingInput[]
  ) {
    return this.dbWrite.prisma.booking.update({
      where: { uid: bookingUid },
      data: {
        attendees: {
          create: attendeesToAdd,
        },
      },
      include: {
        attendees: true,
        user: true,
        eventType: true,
      },
    });
  }
}
