import { CreationSource } from "@calcom/platform-libraries";
import type { Prisma, Profile, Team, User } from "@calcom/prisma/client";
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { CreateManagedUserInput } from "@/modules/users/inputs/create-managed-user.input";
import { UpdateManagedUserInput } from "@/modules/users/inputs/update-managed-user.input";

export type UserWithProfile = User & {
  movedToProfile?: (Profile & { organization: Pick<Team, "isPlatform" | "id" | "slug" | "name"> }) | null;
  profiles?: (Profile & { organization: Pick<Team, "isPlatform" | "id" | "slug" | "name"> })[];
};

@Injectable()
export class UsersRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService
  ) {}

  async create(
    user: CreateManagedUserInput,
    username: string,
    oAuthClientId: string,
    isPlatformManaged: boolean
  ) {
    return this.dbWrite.prisma.user.create({
      data: {
        ...user,
        username,
        platformOAuthClients: {
          connect: { id: oAuthClientId },
        },
        isPlatformManaged,
        creationSource: CreationSource.API_V2,
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

  async findOwnerByTeamIdWithProfile(teamId: number): Promise<UserWithProfile | null> {
    return this.dbRead.prisma.user.findFirst({
      where: {
        teams: {
          some: {
            teamId,
            role: "OWNER",
          },
        },
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

  async findByUsernameWithProfile(username: string) {
    return this.dbRead.prisma.user.findFirst({
      where: { username },
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

  async findManagedUsersByOAuthClientIdAndEmails(
    oauthClientId: string,
    cursor: number,
    limit: number,
    oAuthEmails?: string[]
  ) {
    return this.dbRead.prisma.user.findMany({
      where: {
        platformOAuthClients: {
          some: {
            id: oauthClientId,
          },
        },
        isPlatformManaged: true,
        ...(oAuthEmails && oAuthEmails.length > 0
          ? {
              email: {
                in: oAuthEmails,
              },
            }
          : {}),
      },
      take: limit,
      skip: cursor,
    });
  }

  async update(userId: number, updateData: UpdateManagedUserInput) {
    return this.dbWrite.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  async updateByEmail(email: string, updateData: Prisma.UserUpdateInput) {
    return this.dbWrite.prisma.user.update({
      where: { email },
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

  async getUsersScheduleDefaultIds(userIds: number[]): Promise<Map<number, number | null>> {
    const users = await this.dbRead.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, defaultScheduleId: true },
    });
    return new Map(users.map((user) => [user.id, user.defaultScheduleId]));
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
    return profiles.map((profile: Profile & { user: User }) => profile.user);
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

  async findUserOOORedirectEligible(userId: number, toTeamUserId: number) {
    return await this.dbRead.prisma.user.findUnique({
      where: {
        id: toTeamUserId,
        teams: {
          some: {
            team: {
              members: {
                some: {
                  userId: userId,
                  accepted: true,
                },
              },
            },
          },
        },
      },
      select: {
        id: true,
      },
    });
  }

  async getOrgsManagedUserEmailsBySubscriptionId(subscriptionId: string) {
    return await this.dbRead.prisma.user.findMany({
      distinct: ["email"],
      where: {
        isPlatformManaged: true,
        profiles: {
          some: {
            organization: {
              platformBilling: {
                subscriptionId,
              },
            },
          },
        },
      },
      select: {
        email: true,
      },
    });
  }

  async getActiveManagedUsersAsHost(subscriptionId: string, startTime: Date, endTime: Date) {
    return await this.dbRead.prisma.user.findMany({
      distinct: ["email"],
      where: {
        isPlatformManaged: true,
        profiles: {
          some: {
            organization: {
              platformBilling: {
                subscriptionId,
              },
            },
          },
        },
        bookings: {
          some: {
            userId: { not: null },
            startTime: {
              gte: startTime,
              lte: endTime,
            },
          },
        },
      },
      select: {
        email: true,
      },
    });
  }

  async getActiveManagedUsersAsAttendee(managedUsersEmails: string[], startTime: Date, endTime: Date) {
    return await this.dbRead.prisma.attendee.findMany({
      distinct: ["email"],
      where: {
        email: { in: managedUsersEmails },
        booking: {
          startTime: {
            gte: startTime,
            lte: endTime,
          },
        },
      },
      select: {
        email: true,
      },
    });
  }

  async getUserEmailsVerifiedForTeam(teamId: number) {
    return this.dbRead.prisma.user.findMany({
      where: {
        teams: {
          some: {
            teamId,
          },
        },
      },
      select: {
        id: true,
        email: true,
        secondaryEmails: {
          where: {
            emailVerified: {
              not: null,
            },
          },
          select: {
            email: true,
          },
        },
      },
    });
  }

  async findVerifiedSecondaryEmail(userId: number, email: string) {
    return this.dbRead.prisma.secondaryEmail.findUnique({
      where: {
        userId_email: {
          userId: userId,
          email: email,
        },
      },
      select: {
        id: true,
        emailVerified: true,
      },
    });
  }

  async swapPrimaryEmailWithSecondaryEmail(
    userId: number,
    secondaryEmailId: number,
    oldPrimaryEmail: string,
    oldPrimaryEmailVerified: Date | null,
    newPrimaryEmail: string
  ) {
    const [, updatedUser] = await this.dbWrite.prisma.$transaction([
      this.dbWrite.prisma.secondaryEmail.update({
        where: {
          id: secondaryEmailId,
          userId: userId,
        },
        data: {
          email: oldPrimaryEmail,
          emailVerified: oldPrimaryEmailVerified,
        },
      }),
      this.dbWrite.prisma.user.update({
        where: { id: userId },
        data: {
          email: newPrimaryEmail,
        },
      }),
    ]);

    return updatedUser;
  }
}
