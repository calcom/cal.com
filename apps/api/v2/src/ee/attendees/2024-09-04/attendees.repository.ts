import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import type { CreateAttendeeInput_2024_09_04 } from "./inputs/create-attendee.input";
import type { UpdateAttendeeInput_2024_09_04 } from "./inputs/update-attendee.input";

@Injectable()
export class AttendeesRepository_2024_09_04 {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async createAttendee(data: CreateAttendeeInput_2024_09_04) {
    return this.dbWrite.prisma.attendee.create({
      data: {
        email: data.email,
        name: data.name,
        timeZone: data.timeZone,
        booking: {
          connect: {
            id: data.bookingId,
          },
        },
      },
    });
  }

  async updateAttendee(id: number, data: UpdateAttendeeInput_2024_09_04) {
    return this.dbWrite.prisma.attendee.update({
      where: { id },
      data: {
        ...(data.email && { email: data.email }),
        ...(data.name && { name: data.name }),
        ...(data.timeZone && { timeZone: data.timeZone }),
      },
    });
  }

  async deleteAttendee(id: number) {
    return this.dbWrite.prisma.attendee.delete({
      where: {
        id,
      },
    });
  }

  async getAttendeeWithBookingWithEventType(id: number) {
    return this.dbRead.prisma.attendee.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            eventType: true,
          },
        },
      },
    });
  }

  async getBookingWithEventType(bookingId: number) {
    return this.dbRead.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        eventType: true,
      },
    });
  }
}
