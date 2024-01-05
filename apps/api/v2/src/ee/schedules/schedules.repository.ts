import { CreateScheduleInput } from "@/ee/schedules/inputs/create-schedule.input";
import { AvailabilityInput } from "@/modules/availabilities/availabilities.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";
import { Availability, Schedule } from "@prisma/client";

@Injectable()
export class SchedulesRepository {
  constructor(private readonly dbWrite: PrismaWriteService) {}

  async createScheduleWithAvailability(
    userId: number,
    schedule: CreateScheduleInput,
    availability: AvailabilityInput
  ): Promise<ScheduleWithAvailabilities> {
    const createdSchedule = await this.dbWrite.prisma.schedule.create({
      data: {
        user: {
          connect: {
            id: userId,
          },
        },
        ...schedule,
        availability: {
          create: {
            ...availability,
            userId,
          },
        },
      },
      include: {
        availability: true,
      },
    });

    return createdSchedule;
  }
}

type ScheduleWithAvailabilities = Schedule & { availability: Availability[] };
