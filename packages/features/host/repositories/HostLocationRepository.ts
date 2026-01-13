import type { PrismaClient } from "@calcom/prisma";

export class HostLocationRepository {
  constructor(private prismaClient: PrismaClient) {}

  async linkCredential({
    userId,
    eventTypeId,
    credentialId,
  }: {
    userId: number;
    eventTypeId: number;
    credentialId: number;
  }) {
    return await this.prismaClient.hostLocation.update({
      where: {
        userId_eventTypeId: {
          userId,
          eventTypeId,
        },
      },
      data: {
        credentialId,
      },
    });
  }
}
