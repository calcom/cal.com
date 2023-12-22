import { CreateBookingInput } from "@/modules/endpoints/bookings/inputs/create-booking.input";
import { PrismaReadService } from "@/modules/services/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/services/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class BookingRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async createBooking(userId: number, data: CreateBookingInput) {
    return this.dbWrite.prisma.booking.create({
      data: {
        user: {
          connect: {
            id: userId,
          },
        },
        startTime: new Date(),
        endTime: new Date(),
        title: "Test Event",
        uid: "test-event",
        attendees: {
          create: {
            email: data.email,
            name: data.name,
            timeZone: data.timezone,
          },
        },
      },
    });
  }
}
