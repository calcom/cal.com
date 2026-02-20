import type { PrismaClient } from "@calcom/prisma";

export class TestUserRepository {
  constructor(private prismaClient: PrismaClient) {}

  async deleteByIds({ ids }: { ids: number[] }) {
    return this.prismaClient.user.deleteMany({
      where: {
        id: { in: ids },
      },
    });
  }
}
