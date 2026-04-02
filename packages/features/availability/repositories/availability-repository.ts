import type { Prisma, PrismaClient } from "@calcom/prisma/client";

export class AvailabilityRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async createMany({ data }: { data: Prisma.AvailabilityCreateManyInput[] }) {
    return this.prismaClient.availability.createMany({
      data,
    });
  }
}
