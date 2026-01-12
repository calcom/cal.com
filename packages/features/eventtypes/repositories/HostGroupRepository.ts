import type { PrismaClient } from "@calcom/prisma";

export class HostGroupRepository {
  constructor(private prismaClient: PrismaClient) {}

  async findManyByEventTypeId({ eventTypeId }: { eventTypeId: number }) {
    return await this.prismaClient.hostGroup.findMany({
      where: {
        eventTypeId,
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  async deleteEmptyByEventTypeId({ eventTypeId }: { eventTypeId: number }) {
    return await this.prismaClient.hostGroup.deleteMany({
      where: {
        eventTypeId,
        hosts: {
          none: {},
        },
      },
    });
  }

  async syncHostGroups({
    eventTypeId,
    hostGroups,
  }: {
    eventTypeId: number;
    hostGroups: { id: string; name: string }[];
  }) {
    const existingHostGroups = await this.findManyByEventTypeId({ eventTypeId });

    const existingGroupsMap = new Map(existingHostGroups.map((group) => [group.id, group]));
    const newGroupsMap = new Map(hostGroups.map((group) => [group.id, group]));

    const groupsToCreate = hostGroups.filter((group) => !existingGroupsMap.has(group.id));
    const groupsToUpdate = hostGroups.filter((group) => existingGroupsMap.has(group.id));
    const groupsToDelete = existingHostGroups.filter((existingGroup) => !newGroupsMap.has(existingGroup.id));

    await this.prismaClient.$transaction(async (tx) => {
      if (groupsToCreate.length > 0) {
        await tx.hostGroup.createMany({
          data: groupsToCreate.map((group) => ({
            id: group.id,
            name: group.name,
            eventTypeId,
          })),
        });
      }

      for (const group of groupsToUpdate) {
        await tx.hostGroup.update({
          where: { id: group.id },
          data: { name: group.name },
        });
      }

      if (groupsToDelete.length > 0) {
        await tx.hostGroup.deleteMany({
          where: {
            id: {
              in: groupsToDelete.map((group) => group.id),
            },
          },
        });
      }
    });
  }
}
