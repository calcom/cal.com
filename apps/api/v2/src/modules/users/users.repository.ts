import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { CreateManagedUserInput } from "@/modules/users/inputs/create-managed-user.input";
import { UpdateManagedUserInput } from "@/modules/users/inputs/update-managed-user.input";
import { Injectable } from "@nestjs/common";
import type { Profile, User } from "@prisma/client";

export type UserWithProfile = User & {
  movedToProfile?: Profile | null;
};

@Injectable()
export class UsersRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async create(
    user: CreateManagedUserInput,
    username: string,
    oAuthClientId: string,
    isPlatformManaged: boolean
  ) {
    this.formatInput(user);

    return this.dbWrite.prisma.user.create({
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
    return this.dbWrite.prisma.user.update({
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

  async findByIdWithinPlatformScope(userId: number, clientId: string) {
    return this.dbRead.prisma.user.findFirst({
      where: {
        id: userId,
        isPlatformManaged: true,
        platformOAuthClients: {
          some: {
            id: clientId,
          },
        },
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

  async findByEmailWithProfile(email: string) {
    return this.dbRead.prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        movedToProfile: true,
      },
    });
  }

  async findByUsername(username: string) {
    return this.dbRead.prisma.user.findFirst({
      where: {
        username,
      },
    });
  }

  async findManagedUsersByOAuthClientId(oauthClientId: string, cursor: number, limit: number) {
    return this.dbRead.prisma.user.findMany({
      where: {
        platformOAuthClients: {
          some: {
            id: oauthClientId,
          },
        },
        isPlatformManaged: true,
      },
      take: limit,
      skip: cursor,
    });
  }

  async update(userId: number, updateData: UpdateManagedUserInput) {
    this.formatInput(updateData);

    return this.dbWrite.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  async updateUsername(userId: number, newUsername: string) {
    return this.dbWrite.prisma.user.update({
      where: { id: userId },
      data: {
        username: newUsername,
      },
    });
  }

  async delete(userId: number): Promise<User> {
    return this.dbWrite.prisma.user.delete({
      where: { id: userId },
    });
  }

  formatInput(userInput: CreateManagedUserInput | UpdateManagedUserInput) {
    if (userInput.weekStart) {
      userInput.weekStart = userInput.weekStart;
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
