import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Injectable } from "@nestjs/common";
import type { User } from "@prisma/client";

@Injectable()
export class UserRepository {
  constructor(private readonly dbRead: PrismaReadService) {}

  async findById(userId: number, includeRelations?: UserRelations) {
    const user = await this.dbRead.prisma.user.findUniqueOrThrow({
      where: {
        id: userId,
      },
      include: includeRelations,
    });
    return this.sanitize(user);
  }

  async findByEmail(email: string, includeRelations?: UserRelations) {
    const user = await this.dbRead.prisma.user.findUniqueOrThrow({
      where: {
        email,
      },
      include: includeRelations,
    });
    return this.sanitize(user);
  }

  sanitize(user: User): Partial<User> {
    const keys: (keyof User)[] = ["password"];
    return Object.fromEntries(Object.entries(user).filter(([key]) => !keys.includes(key as keyof User)));
  }
}

type UserRelations = {
  eventTypes?: boolean;
  credentials?: boolean;
  teams?: boolean;
  bookings?: boolean;
  schedules?: boolean;
  selectedCalendars?: boolean;
  availability?: boolean;
  webhooks?: boolean;
  destinationCalendar?: boolean;
  metadata?: boolean;
  impersonatedUsers?: boolean;
  impersonatedBy?: boolean;
  apiKeys?: boolean;
  accounts?: boolean;
  sessions?: boolean;
  Feedback?: boolean;
  ownedEventTypes?: boolean;
  workflows?: boolean;
  routingForms?: boolean;
  verifiedNumbers?: boolean;
  hosts?: boolean;
  organization?: boolean;
  accessCodes?: boolean;
  platformOAuthClients?: boolean;
};
