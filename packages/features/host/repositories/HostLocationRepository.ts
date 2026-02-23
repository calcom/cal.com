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

  async upsertMany(
    locations: {
      userId: number;
      eventTypeId: number;
      type: string;
      link: string | null;
      address: string | null;
      phoneNumber: string | null;
      credentialId: number | null;
    }[]
  ) {
    return await Promise.all(
      locations.map((location) =>
        this.prismaClient.hostLocation.upsert({
          where: {
            userId_eventTypeId: {
              userId: location.userId,
              eventTypeId: location.eventTypeId,
            },
          },
          create: location,
          update: {
            type: location.type,
            link: location.link,
            address: location.address,
            phoneNumber: location.phoneNumber,
            credentialId: location.credentialId,
          },
        })
      )
    );
  }
}
