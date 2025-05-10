import { type PrismaClient, readonlyPrisma } from "@calcom/prisma";

import type { Workflow, WorkflowStep } from "../types";

type FieldSelect = true | { select: Record<string, FieldSelect> };

const stepsSelect = {
  action: true,
  sendTo: true,
  template: true,
  reminderBody: true,
  emailSubject: true,
  id: true,
  sender: true,
  includeCalendarEvent: true,
  numberVerificationPending: true,
  numberRequired: true,
  verifiedAt: true,
} satisfies Record<keyof WorkflowStep, FieldSelect>;

const workflowSelect = {
  id: true,
  name: true,
  trigger: true,
  time: true,
  timeUnit: true,
  userId: true,
  teamId: true,
  steps: { select: stepsSelect },
} satisfies Record<keyof Workflow, FieldSelect>;

export class WorkflowRepository {
  constructor(private readonly dbRead: PrismaClient) {}

  getTeamWorkflows(teamId: number, where?: { isActiveOnAll?: boolean }): Promise<Workflow[]> {
    return this.dbRead.workflow.findMany({
      where: { teamId, ...where },
      select: workflowSelect,
    });
  }

  getUserWorkflows(
    userId: number,
    where?: { isActiveOnAll?: boolean; teamId?: number | null }
  ): Promise<Workflow[]> {
    return this.dbRead.workflow.findMany({
      where: { userId, ...where },
      select: workflowSelect,
    });
  }

  getWorkflowsActiveOnEventType(eventTypeId: number): Promise<Workflow[]> {
    return this.dbRead.workflow.findMany({
      where: { activeOn: { some: { eventTypeId } } },
      select: workflowSelect,
    });
  }

  getWorkflowsActiveOnTeam(teamId: number): Promise<Workflow[]> {
    return this.dbRead.workflow.findMany({
      where: { activeOnTeams: { some: { teamId } } },
      select: workflowSelect,
    });
  }

  getWorkflowsActiveOnTeamMember(userId: number): Promise<Workflow[]> {
    return this.dbRead.workflow.findMany({
      where: {
        activeOnTeams: {
          some: {
            team: {
              members: { some: { userId, accepted: true } },
            },
          },
        },
      },
      select: workflowSelect,
    });
  }
}

export const workflowRepository = new WorkflowRepository(readonlyPrisma);
