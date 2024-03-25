import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { CreateManagedPlatformUserInput } from "@/modules/users/inputs/create-managed-platform-user.input";
import { UpdateManagedPlatformUserInput } from "@/modules/users/inputs/update-managed-platform-user.input";
import { Injectable } from "@nestjs/common";
import type { Profile, User } from "@prisma/client";

export type UserWithProfile = User & {
  movedToProfile?: Profile | null;
};

@Injectable()
export class UsersRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async create(
    user: CreateManagedPlatformUserInput,
    username: string,
    oAuthClientId: string,
    isPlatformManaged: boolean
  ) {
    this.formatInput(user);

    return this.dbRead.prisma.user.create({
      data: {
        ...user,
        username,
        platformOAuthClients: {
          connect: { id: oAuthClientId },
        },
        isPlatformManaged,
      },
    });
  }

  async addToOAuthClient(userId: number, oAuthClientId: string) {
    return this.dbRead.prisma.user.update({
      data: {
        platformOAuthClients: {
          connect: { id: oAuthClientId },
        },
      },
      where: { id: userId },
    });
  }

  async findById(userId: number) {
    return this.dbRead.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
  }

  async findByIdWithProfile(userId: number): Promise<UserWithProfile | null> {
    return this.dbRead.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        movedToProfile: true,
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

  async update(userId: number, updateData: UpdateManagedPlatformUserInput) {
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

  formatInput(userInput: CreateManagedPlatformUserInput | UpdateManagedPlatformUserInput) {
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
