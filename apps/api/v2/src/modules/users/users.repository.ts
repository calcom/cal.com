import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { CreateUserInput } from "@/modules/users/inputs/create-user.input";
import { UpdateUserInput } from "@/modules/users/inputs/update-user.input";
import { Injectable } from "@nestjs/common";
import type { User } from "@prisma/client";

@Injectable()
export class UsersRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async create(user: CreateUserInput, oAuthClientId: string) {
    this.formatInput(user);

    return this.dbRead.prisma.user.create({
      data: {
        ...user,
        platformOAuthClients: {
          connect: { id: oAuthClientId },
        },
      },
    });
  }

  async findById(userId: number) {
    return this.dbRead.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
  }

  async findByIdWithCalendars(userId: number) {
    return this.dbRead.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        selectedCalendars: true,
        destinationCalendar: true,
      },
    });
  }

  async findByEmail(email: string) {
    return this.dbRead.prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

  async update(userId: number, updateData: UpdateUserInput) {
    this.formatInput(updateData);

    return this.dbWrite.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  async delete(userId: number): Promise<User> {
    return this.dbWrite.prisma.user.delete({
      where: { id: userId },
    });
  }

  formatInput(userInput: CreateUserInput | UpdateUserInput) {
    if (userInput.weekStart) {
      userInput.weekStart = capitalize(userInput.weekStart);
    }

    if (userInput.timeZone) {
      userInput.timeZone = capitalizeTimezone(userInput.timeZone);
    }
  }

  setDefaultSchedule(userId: number, scheduleId: number) {
    return this.dbWrite.prisma.user.update({
      where: { id: userId },
      data: {
        defaultScheduleId: scheduleId,
      },
    });
  }
}

function capitalizeTimezone(timezone: string) {
  const segments = timezone.split("/");

  const capitalizedSegments = segments.map((segment) => {
    return capitalize(segment);
  });

  return capitalizedSegments.join("/");
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
