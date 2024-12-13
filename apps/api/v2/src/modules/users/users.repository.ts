import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { CreateManagedUserInput } from "@/modules/users/inputs/create-managed-user.input";
import { UpdateManagedUserInput } from "@/modules/users/inputs/update-managed-user.input";
import { Injectable, NotFoundException } from "@nestjs/common";
import type { Profile, User, Team } from "@prisma/client";

export type UserWithProfile = User & {
  movedToProfile?: (Profile & { organization: Pick<Team, "isPlatform" | "id" | "slug" | "name"> }) | null;
  profiles?: (Profile & { organization: Pick<Team, "isPlatform" | "id" | "slug" | "name"> })[];
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
        movedToProfile: {
          include: { organization: { select: { isPlatform: true, name: true, slug: true, id: true } } },
        },
        profiles: {
          include: { organization: { select: { isPlatform: true, name: true, slug: true, id: true } } },
        },
      },
    });
  }

  async findByIdsWithEventTypes(userIds: number[]) {
    return this.dbRead.prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      include: {
        eventTypes: true,
      },
    });
  }

  async findByIds(userIds: number[]) {
    return this.dbRead.prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
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
        movedToProfile: {
          include: { organization: { select: { isPlatform: true, name: true, slug: true, id: true } } },
        },
        profiles: {
          include: { organization: { select: { isPlatform: true, name: true, slug: true, id: true } } },
        },
      },
    });
  }

  async findByUsername(username: string, orgSlug?: string, orgId?: number) {
    return this.dbRead.prisma.user.findFirst({
      where:
        orgId || orgSlug
          ? {
              profiles: {
                some: {
                  organization: orgSlug ? { slug: orgSlug } : { id: orgId },
                  username: username,
                },
              },
            }
          : {
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
  }

  setDefaultSchedule(userId: number, scheduleId: number) {
    return this.dbWrite.prisma.user.update({
      where: { id: userId },
      data: {
        defaultScheduleId: scheduleId,
      },
    });
  }

  async getUserScheduleDefaultId(userId: number) {
    const user = await this.findById(userId);

    if (!user?.defaultScheduleId) return null;

    return user?.defaultScheduleId;
  }

  async getOrganizationUsers(organizationId: number) {
    const profiles = await this.dbRead.prisma.profile.findMany({
      where: {
        organizationId,
      },
      include: {
        user: true,
      },
    });
    return profiles.map((profile) => profile.user);
  }

  async setDefaultConferencingApp(userId: number, appSlug?: string, appLink?: string) {
    const user = await this.findById(userId);

    if (!user) {
      throw new NotFoundException("user not found");
    }

    return await this.dbWrite.prisma.user.update({
      data: {
        metadata:
          typeof user.metadata === "object"
            ? {
                ...user.metadata,
                defaultConferencingApp: {
                  appSlug: appSlug,
                  appLink: appLink,
                },
              }
            : {},
      },

      where: { id: userId },
    });
  }
}
