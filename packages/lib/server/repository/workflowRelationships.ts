import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

export class WorkflowRelationshipsRepository {
  // WorkflowsOnRoutingForms methods
  static async findManyWorkflowsOnRoutingForms(workflowId: number) {
    return await prisma.workflowsOnRoutingForms.findMany({
      where: {
        workflowId,
      },
      select: {
        routingFormId: true,
      },
    });
  }

  static async deleteManyWorkflowsOnRoutingForms(workflowId: number) {
    return await prisma.workflowsOnRoutingForms.deleteMany({
      where: {
        workflowId,
      },
    });
  }

  static async createManyWorkflowsOnRoutingForms(data: Array<{ workflowId: number; routingFormId: string }>) {
    return await prisma.workflowsOnRoutingForms.createMany({
      data,
    });
  }

  // WorkflowsOnEventTypes methods
  static async findManyWorkflowsOnEventTypes(workflowId: number) {
    return await prisma.workflowsOnEventTypes.findMany({
      where: {
        workflowId,
      },
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

  static async deleteManyWorkflowsOnEventTypes(workflowId: number) {
    return await prisma.workflowsOnEventTypes.deleteMany({
      where: {
        workflowId,
      },
    });
  }

  static async createManyWorkflowsOnEventTypes(data: Array<{ workflowId: number; eventTypeId: number }>) {
    return await prisma.workflowsOnEventTypes.createMany({
      data,
    });
  }

  // WorkflowsOnTeams methods
  static async findManyWorkflowsOnTeams(workflowId: number) {
    return await prisma.workflowsOnTeams.findMany({
      where: {
        workflowId,
      },
      select: {
        teamId: true,
      },
    });
  }

  static async deleteManyWorkflowsOnTeams(workflowId: number) {
    return await prisma.workflowsOnTeams.deleteMany({
      where: {
        workflowId,
      },
    });
  }

  static async createManyWorkflowsOnTeams(data: Array<{ workflowId: number; teamId: number }>) {
    return await prisma.workflowsOnTeams.createMany({
      data,
    });
  }

  // WorkflowReminder methods
  static async findManyWorkflowReminders(workflowStepId: number) {
    return await prisma.workflowReminder.findMany({
      where: {
        workflowStepId,
      },
      select: {
        id: true,
        referenceId: true,
        method: true,
        booking: {
          select: {
            eventTypeId: true,
          },
        },
      },
    });
  }

  // WorkflowStep methods
  static async deleteWorkflowStep(stepId: number) {
    return await prisma.workflowStep.delete({
      where: {
        id: stepId,
      },
    });
  }

  static async updateWorkflowStep(stepId: number, data: Prisma.WorkflowStepUpdateInput) {
    return await prisma.workflowStep.update({
      where: {
        id: stepId,
      },
      data,
    });
  }

  static async createWorkflowStep(data: Prisma.WorkflowStepCreateInput) {
    return await prisma.workflowStep.create({
      data,
    });
  }

  // Workflow methods
  static async updateWorkflow(id: number, data: Prisma.WorkflowUpdateInput) {
    return await prisma.workflow.update({
      where: {
        id,
      },
      data,
    });
  }

  static async findWorkflowWithDetails(id: number) {
    return await prisma.workflow.findUnique({
      where: {
        id,
      },
      include: {
        activeOn: {
          select: {
            eventType: true,
          },
        },
        activeOnTeams: {
          select: {
            team: true,
          },
        },
        activeOnRoutingForms: {
          select: {
            routingForm: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        team: {
          select: {
            id: true,
            slug: true,
            members: true,
            name: true,
            isOrganization: true,
          },
        },
        steps: {
          orderBy: {
            stepNumber: "asc",
          },
        },
      },
    });
  }
}
