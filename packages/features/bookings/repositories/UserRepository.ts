import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

export class UserRepository {
  constructor(private prisma: Omit<PrismaClient, "user">) {}

  async findUsersByEmails(emails: string[]) {
    if (emails.length === 0) return [];

    return this.prisma.user.findMany({
      where: {
        OR: [
          { email: { in: emails } },
          { secondaryEmails: { hasSome: emails } },
        ],
      },
      select: {
        id: true,
        email: true,
        secondaryEmails: true,
        name: true,
      },
    });
  }
}