import type { PrismaClient } from "@calcom/prisma/client";
import type { TGetVerifiedNumbersInputSchema } from "@calcom/trpc/server/routers/viewer/workflows/getVerifiedNumbers.schema";

export class VerifiedNumberRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async getVerifiedNumbers({ userId, teamId }: TGetVerifiedNumbersInputSchema & { userId: number | null }) {
    if (!userId) {
      throw new Error("User Id not found");
    }
    const verifiedNumbers = await this.prismaClient.verifiedNumber.findMany({
      where: {
        OR: [{ userId }, { teamId }],
      },
    });

    return verifiedNumbers;
  }

  async findVerifiedNumber({
    userId,
    teamId,
    phoneNumber,
  }: {
    userId?: number | null;
    teamId?: number | null;
    phoneNumber: string;
  }) {
    return await this.prismaClient.verifiedNumber.findFirst({
      where: {
        OR: [{ userId }, { teamId }],
        phoneNumber,
      },
    });
  }

  async createVerifiedNumber({
    userId,
    teamId,
    phoneNumber,
  }: {
    userId?: number | null;
    teamId?: number | null;
    phoneNumber: string;
  }) {
    return await this.prismaClient.verifiedNumber.create({
      data: {
        userId,
        teamId,
        phoneNumber,
      },
    });
  }
}
