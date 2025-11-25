import type { PrismaClient } from "@calcom/prisma/client";
import {
  TimeUnit as PrismaTimeUnit,
  WorkflowTriggerEvents as PrismaWorkflowTriggerEvents,
  WorkflowType as PrismaWorkflowType,
} from "@calcom/prisma/enums";
import db from "@calcom/prisma";

import type { IWorkflowRepository } from "../../domain/repositories/IWorkflowRepository";
import type { Workflow, CreateWorkflowData, UpdateWorkflowData } from "../../domain/models/Workflow";
import { WorkflowOutputMapper } from "../mappers/WorkflowOutputMapper";

const FORM_TRIGGER_WORKFLOW_EVENTS = [
  PrismaWorkflowTriggerEvents.FORM_SUBMITTED,
  PrismaWorkflowTriggerEvents.FORM_SUBMITTED_NO_EVENT,
];

/**
 * Infrastructure implementation of IWorkflowRepository
 * Handles Prisma interactions and maps to domain models
 * Following PBAC's RoleRepository pattern
 */
export class WorkflowRepository implements IWorkflowRepository {
  constructor(private readonly prisma: PrismaClient = db) {}

  private readonly includeSteps = {
    steps: {
      orderBy: {
        stepNumber: "asc" as const,
      },
    },
  };

  async findById(id: number): Promise<Workflow | null> {
    const result = await this.prisma.workflow.findUnique({
      where: { id },
      include: this.includeSteps,
    });
    return result ? WorkflowOutputMapper.toDomain(result) : null;
  }

  async findByUserId(userId: number, excludeFormTriggers = false): Promise<Workflow[]> {
    const results = await this.prisma.workflow.findMany({
      where: {
        userId,
        ...(excludeFormTriggers && {
          trigger: {
            notIn: FORM_TRIGGER_WORKFLOW_EVENTS,
          },
        }),
      },
      include: this.includeSteps,
      orderBy: { id: "asc" },
    });
    return WorkflowOutputMapper.toDomainList(results);
  }

  async findByTeamId(
    teamId: number,
    userId: number,
    excludeFormTriggers = false
  ): Promise<Workflow[]> {
    const results = await this.prisma.workflow.findMany({
      where: {
        team: {
          id: teamId,
          members: {
            some: {
              userId,
              accepted: true,
            },
          },
        },
        ...(excludeFormTriggers && {
          trigger: {
            notIn: FORM_TRIGGER_WORKFLOW_EVENTS,
          },
        }),
      },
      include: this.includeSteps,
      orderBy: { id: "asc" },
    });
    return WorkflowOutputMapper.toDomainList(results);
  }

  async findActiveOrgWorkflows(params: {
    orgId: number;
    userId: number;
    teamId: number;
    excludeFormTriggers: boolean;
  }): Promise<Workflow[]> {
    const results = await this.prisma.workflow.findMany({
      where: {
        ...(params.excludeFormTriggers && {
          trigger: {
            notIn: FORM_TRIGGER_WORKFLOW_EVENTS,
          },
        }),
        team: {
          id: params.orgId,
          members: {
            some: {
              userId: params.userId,
              accepted: true,
            },
          },
        },
        OR: [
          {
            isActiveOnAll: true,
          },
          {
            activeOnTeams: {
              some: {
                team: {
                  OR: [
                    { id: params.teamId },
                    {
                      members: {
                        some: {
                          userId: params.userId,
                          accepted: true,
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        ],
      },
      include: this.includeSteps,
    });
    return WorkflowOutputMapper.toDomainList(results);
  }

  async findAllWorkflows(userId: number, excludeFormTriggers = false): Promise<Workflow[]> {
    const results = await this.prisma.workflow.findMany({
      where: {
        ...(excludeFormTriggers && {
          trigger: {
            notIn: FORM_TRIGGER_WORKFLOW_EVENTS,
          },
        }),
        OR: [
          { userId },
          {
            team: {
              members: {
                some: {
                  userId,
                  accepted: true,
                },
              },
            },
          },
        ],
      },
      include: this.includeSteps,
      orderBy: { id: "asc" },
    });
    return WorkflowOutputMapper.toDomainList(results);
  }

  async findWorkflowsActiveOnRoutingForm(routingFormId: string): Promise<Workflow[]> {
    const results = await this.prisma.workflow.findMany({
      where: {
        activeOnRoutingForms: {
          some: {
            routingFormId,
          },
        },
      },
      include: this.includeSteps,
    });
    return WorkflowOutputMapper.toDomainList(results);
  }

  async findActiveWorkflowsOnTeam(params: {
    parentTeamId: number;
    teamId: number;
  }): Promise<Workflow[]> {
    const results = await this.prisma.workflow.findMany({
      where: {
        teamId: params.parentTeamId,
        OR: [
          {
            activeOnTeams: {
              some: {
                teamId: params.teamId,
              },
            },
          },
          {
            isActiveOnAll: true,
          },
        ],
      },
      include: this.includeSteps,
    });
    return WorkflowOutputMapper.toDomainList(results);
  }

  async create(data: CreateWorkflowData): Promise<Workflow> {
    const result = await this.prisma.workflow.create({
      data: {
        name: data.name,
        userId: data.userId,
        teamId: data.teamId,
        trigger: data.trigger as PrismaWorkflowTriggerEvents,
        time: data.time,
        timeUnit: data.timeUnit as PrismaTimeUnit,
        isActiveOnAll: data.isActiveOnAll ?? false,
        type: (data.type as PrismaWorkflowType) ?? PrismaWorkflowType.EVENT_TYPE,
      },
      include: this.includeSteps,
    });
    return WorkflowOutputMapper.toDomain(result);
  }

  async update(id: number, data: UpdateWorkflowData): Promise<Workflow> {
    const result = await this.prisma.workflow.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.trigger !== undefined && { trigger: data.trigger as PrismaWorkflowTriggerEvents }),
        ...(data.time !== undefined && { time: data.time }),
        ...(data.timeUnit !== undefined && { timeUnit: data.timeUnit as PrismaTimeUnit }),
        ...(data.isActiveOnAll !== undefined && { isActiveOnAll: data.isActiveOnAll }),
      },
      include: this.includeSteps,
    });
    return WorkflowOutputMapper.toDomain(result);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.workflow.delete({
      where: { id },
    });
  }

  async getActiveOnEventTypeIds(params: {
    workflowId: number;
    userId: number;
    teamId?: number;
  }): Promise<number[]> {
    const workflow = await this.prisma.workflow.findFirst({
      where: {
        id: params.workflowId,
        userId: params.userId,
        teamId: params.teamId ?? undefined,
      },
      select: {
        activeOn: {
          select: {
            eventTypeId: true,
          },
        },
      },
    });

    if (!workflow) {
      return [];
    }

    return workflow.activeOn.map((active) => active.eventTypeId);
  }
}
