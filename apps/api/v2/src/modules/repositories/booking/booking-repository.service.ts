import type { CreateBookingSchema } from "@/modules/booking/dtos/create-booking";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";
import type { z } from "nestjs-zod/z";

@Injectable()
export class BookingRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async createBooking(userId: number, data: z.infer<typeof CreateBookingSchema>) {
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
