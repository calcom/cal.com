import prisma from "@calcom/prisma";

type IDestinationCalendar = {
  userId: number;
  profileId: number | null;
  credentialId: number | null;
  integration: string;
  externalId: string;
};

export class DestinationCalendarRepository {
  static async create(data: IDestinationCalendar) {
    const { userId, profileId, credentialId, integration, externalId } = data;
    return prisma.destinationCalendar.create({
      data: {
        ...(userId
          ? {
              user: {
                connect: {
                  id: userId,
                },
              },
            }
          : null),
        ...(profileId
          ? {
              profile: {
                connect: {
                  id: profileId,
                },
              },
            }
          : null),
        ...(credentialId
          ? {
              credential: {
                connect: {
                  id: credentialId,
                },
              },
            }
          : null),
        integration,
        externalId,
      },
    });
  }
}
