import type { PrismaClient } from "@calcom/prisma";

export class PrismaOOORepository {
  constructor(private prismaClient: PrismaClient) {}

  async findManyOOO({
    startTimeDate,
    endTimeDate,
    allUserIds,
  }: {
    startTimeDate: Date;
    endTimeDate: Date;
    allUserIds: number[];
  }) {
    return this.prismaClient.outOfOfficeEntry.findMany({
      where: {
        userId: {
          in: allUserIds,
        },
        OR: [
          // outside of range
          // (start <= 'dateTo' AND end >= 'dateFrom')
          {
            start: {
              lte: endTimeDate,
            },
            end: {
              gte: startTimeDate,
            },
          },
          // start is between dateFrom and dateTo but end is outside of range
          // (start <= 'dateTo' AND end >= 'dateTo')
          {
            start: {
              lte: endTimeDate,
            },

            end: {
              gte: endTimeDate,
            },
          },
          // end is between dateFrom and dateTo but start is outside of range
          // (start <= 'dateFrom' OR end <= 'dateTo')
          {
            start: {
              lte: startTimeDate,
            },

            end: {
              lte: endTimeDate,
            },
          },
        ],
      },
      select: {
        id: true,
        start: true,
        end: true,
        notes: true,
        showNotePublicly: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        toUser: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        reason: {
          select: {
            id: true,
            emoji: true,
            reason: true,
          },
        },
      },
    });
  }

  async findUserOOODays({ userId, dateTo, dateFrom }: { userId: number; dateTo: string; dateFrom: string }) {
    return this.prismaClient.outOfOfficeEntry.findMany({
      where: {
        userId,
        OR: [
          // outside of range
          // (start <= 'dateTo' AND end >= 'dateFrom')
          {
            start: {
              lte: dateTo,
            },
            end: {
              gte: dateFrom,
            },
          },
          // start is between dateFrom and dateTo but end is outside of range
          // (start <= 'dateTo' AND end >= 'dateTo')
          {
            start: {
              lte: dateTo,
            },

            end: {
              gte: dateTo,
            },
          },
          // end is between dateFrom and dateTo but start is outside of range
          // (start <= 'dateFrom' OR end <= 'dateTo')
          {
            start: {
              lte: dateFrom,
            },

            end: {
              lte: dateTo,
            },
          },
        ],
      },
      select: {
        id: true,
        start: true,
        end: true,
        notes: true,
        showNotePublicly: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        toUser: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        reason: {
          select: {
            id: true,
            emoji: true,
            reason: true,
          },
        },
      },
    });
  }

  async findOOOEntriesInInterval({
    userIds,
    startDate,
    endDate,
  }: {
    userIds: number[];
    startDate: Date;
    endDate: Date;
  }) {
    return this.prismaClient.outOfOfficeEntry.findMany({
      where: {
        userId: {
          in: userIds,
        },
        start: {
          lte: endDate,
        },
        end: {
          gte: startDate,
        },
      },
      select: {
        start: true,
        end: true,
        userId: true,
      },
    });
  }

  async createOOOEntry({
    uuid,
    start,
    end,
    notes,
    userId,
    reasonId,
  }: {
    uuid: string;
    start: Date;
    end: Date;
    notes: string;
    userId: number;
    reasonId: number;
  }) {
    return this.prismaClient.outOfOfficeEntry.create({
      data: {
        uuid,
        start,
        end,
        notes,
        userId,
        reasonId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async findOOOEntryByExternalReference({
    source,
    externalId,
  }: {
    source: string;
    externalId: string;
  }) {
    const reference = await this.prismaClient.outOfOfficeReference.findUnique({
      where: {
        source_externalId: {
          source,
          externalId,
        },
      },
      include: {
        oooEntry: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        credential: {
          select: {
            id: true,
            type: true,
            key: true,
            appId: true,
            userId: true,
            teamId: true,
            invalid: true,
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });
    return reference;
  }

  async deleteOOOEntryByExternalReference({
    source,
    externalId,
  }: {
    source: string;
    externalId: string;
  }) {
    const reference = await this.prismaClient.outOfOfficeReference.findUnique({
      where: {
        source_externalId: {
          source,
          externalId,
        },
      },
    });

    if (!reference) {
      return null;
    }

    return this.prismaClient.outOfOfficeEntry.delete({
      where: {
        id: reference.oooEntryId,
      },
    });
  }

  async createOOOReference({
    oooEntryId,
    source,
    externalId,
    externalReasonId,
    externalReasonName,
    credentialId,
  }: {
    oooEntryId: number;
    source: string;
    externalId: string;
    externalReasonId?: string | null;
    externalReasonName?: string | null;
    credentialId?: number | null;
  }) {
    return this.prismaClient.outOfOfficeReference.create({
      data: {
        oooEntryId,
        source,
        externalId,
        externalReasonId,
        externalReasonName,
        credentialId,
      },
    });
  }

  async updateOOOEntry({
    uuid,
    start,
    end,
    notes,
    userId,
    reasonId,
  }: {
    uuid: string;
    start: Date;
    end: Date;
    notes: string;
    userId: number;
    reasonId: number;
  }) {
    return this.prismaClient.outOfOfficeEntry.update({
      where: {
        uuid,
      },
      data: {
        uuid,
        start,
        end,
        notes,
        userId,
        reasonId,
      },
    });
  }
}
