import type { PrismaClient } from "@calcom/prisma";

export class WorkflowRelationsRepository {
  constructor(private prismaClient: PrismaClient) {}

  // Team relationship methods
  async deleteAllActiveOnTeams(workflowId: number) {
    return await this.prismaClient.workflowsOnTeams.deleteMany({
      where: { workflowId },
    });
  }

  async createActiveOnTeams(workflowId: number, teamIds: number[]) {
    if (teamIds.length === 0) return;

    return await this.prismaClient.workflowsOnTeams.createMany({
      data: teamIds.map((teamId) => ({
        workflowId,
        teamId,
      })),
    });
  }

  async findActiveOnTeams(workflowId: number) {
    return await this.prismaClient.workflowsOnTeams.findMany({
      where: { workflowId },
      select: {
        teamId: true,
      },
    });
  }

  // Routing Forms relationship methods
  async deleteAllActiveOnRoutingForms(workflowId: number) {
    return await this.prismaClient.workflowsOnRoutingForms.deleteMany({
      where: { workflowId },
    });
  }

  async createActiveOnRoutingForms(workflowId: number, routingFormIds: string[]) {
    if (routingFormIds.length === 0) return;

    return await this.prismaClient.workflowsOnRoutingForms.createMany({
      data: routingFormIds.map((routingFormId) => ({
        workflowId,
        routingFormId,
      })),
    });
  }

  // Event Types relationship methods
  async deleteAllActiveOnEventTypes(workflowId: number) {
    return await this.prismaClient.workflowsOnEventTypes.deleteMany({
      where: { workflowId },
    });
  }

  async createActiveOnEventTypes(workflowId: number, eventTypeIds: number[]) {
    if (eventTypeIds.length === 0) return;

    return await this.prismaClient.workflowsOnEventTypes.createMany({
      data: eventTypeIds.map((eventTypeId) => ({
        workflowId,
        eventTypeId,
      })),
    });
  }

  async findActiveOnEventTypes(workflowId: number) {
    return await this.prismaClient.workflowsOnEventTypes.findMany({
      where: { workflowId },
      select: {
        eventTypeId: true,
        eventType: {
          select: {
            children: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });
  }

  async deleteAllActiveOnRelations(workflowId: number) {
    return await Promise.all([
      this.deleteAllActiveOnTeams(workflowId),
      this.deleteAllActiveOnRoutingForms(workflowId),
      this.deleteAllActiveOnEventTypes(workflowId),
    ]);
  }
}
