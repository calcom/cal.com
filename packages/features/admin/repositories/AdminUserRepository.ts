import type { PrismaClient } from "@prisma/client";

export class AdminUserRepository {
  constructor(private prisma: PrismaClient) {}

  async setLocked(userId: number, locked: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
      },
      data: { locked },
    });
  }
}
