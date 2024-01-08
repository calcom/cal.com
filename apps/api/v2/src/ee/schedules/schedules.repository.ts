import { CreateAvailabilityInput } from "@/ee/availabilities/inputs/create-availability.input";
import { CreateScheduleInput } from "@/ee/schedules/inputs/create-schedule.input";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class SchedulesRepository {
  constructor(private readonly dbWrite: PrismaWriteService) {}

  async createScheduleWithAvailabilities(
    userId: number,
    schedule: CreateScheduleInput,
    availabilities: CreateAvailabilityInput[]
  ) {
    const createdSchedule = await this.dbWrite.prisma.schedule.create({
      data: {
        user: {
          connect: {
            id: userId,
          },
        },
        ...schedule,
        availability: {
          createMany: {
            data: availabilities.map((availability) => {
              return {
                ...availability,
                userId,
              };
            }),
          },
        },
      },
      include: {
        availability: {
          select: {
            id: true,
            days: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    return createdSchedule;
  }
}
