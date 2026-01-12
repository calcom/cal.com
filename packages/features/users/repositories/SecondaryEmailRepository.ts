import type { PrismaClient } from "@calcom/prisma";

export class SecondaryEmailRepository {
  constructor(private prismaClient: PrismaClient) {}

  async findByIdAndUserId({ id, userId }: { id: number; userId: number }) {
    return await this.prismaClient.secondaryEmail.findUnique({
      where: {
        id,
        userId,
      },
    });
  }
}
