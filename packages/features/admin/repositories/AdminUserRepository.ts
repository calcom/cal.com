import type { PrismaClient } from "@calcom/prisma";

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

  async findById(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        twoFactorEnabled: true,
      },
    });
  }

  async removeTwoFactor(userId: number) {
    return this.prisma.user.update({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
      },
      data: {
        backupCodes: null,
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });
  }
}
