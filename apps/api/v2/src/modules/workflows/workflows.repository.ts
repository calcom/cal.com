import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Injectable } from "@nestjs/common";

import { TimeUnit, WorkflowTriggerEvents } from "@calcom/platform-libraries";
import { TUpdateInputSchema } from "@calcom/platform-libraries/workflows";
import { updateWorkflow } from "@calcom/platform-libraries/workflows";
import type { PrismaClient } from "@calcom/prisma";
import type { Workflow, WorkflowStep } from "@calcom/prisma/client";

export type WorkflowType = Workflow & {
  activeOn: { eventTypeId: number }[];
  steps: WorkflowStep[];
  activeOnRoutingForms: { routingFormId: string }[];
};

@Injectable()
export class WorkflowsRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService
  ) {}

  async deleteTeamWorkflowById(teamId: number, workflowId: number) {
    return await this.dbWrite.prisma.workflow.delete({ where: { id: workflowId, teamId } });
  }

  async getEventTypeTeamWorkflowById(teamId: number, id: number): Promise<WorkflowType | null> {
    const workflow = await this.dbRead.prisma.workflow.findUnique({
      where: {
        id: id,
        teamId: teamId,
        type: "EVENT_TYPE",
      },
      include: {
        steps: true,
        activeOn: { select: { eventTypeId: true } },
        activeOnRoutingForms: { select: { routingFormId: true } },
      },
    });

    return workflow;
  }

  async getRoutingFormTeamWorkflowById(teamId: number, id: number): Promise<WorkflowType | null> {
    const workflow = await this.dbRead.prisma.workflow.findUnique({
      where: {
        id: id,
        teamId: teamId,
        type: "ROUTING_FORM",
      },
      include: {
        steps: true,
        activeOn: { select: { eventTypeId: true } },
        activeOnRoutingForms: { select: { routingFormId: true } },
      },
    });

    return workflow;
  }

  async getEventTypeTeamWorkflows(teamId: number, skip: number, take: number): Promise<WorkflowType[]> {
    const workflows = await this.dbRead.prisma.workflow.findMany({
      where: {
        teamId: teamId,
        type: "EVENT_TYPE",
      },
      include: {
        steps: true,
        activeOn: { select: { eventTypeId: true } },
        activeOnRoutingForms: { select: { routingFormId: true } },
      },
      skip,
      take,
    });

    return workflows;
  }

  async getRoutingFormTeamWorkflows(teamId: number, skip: number, take: number): Promise<WorkflowType[]> {
    const workflows = await this.dbRead.prisma.workflow.findMany({
      where: {
        teamId: teamId,
        type: "ROUTING_FORM",
      },
      include: {
        steps: true,
        activeOn: { select: { eventTypeId: true } },
        activeOnRoutingForms: { select: { routingFormId: true } },
      },
      skip,
      take,
    });

    return workflows;
  }

  async createTeamWorkflowHusk(teamId: number) {
    return this.dbWrite.prisma.workflow.create({
      data: {
        name: "",
        trigger: WorkflowTriggerEvents.BEFORE_EVENT,
        time: 24,
        timeUnit: TimeUnit.HOUR,
        teamId,
      },
      include: { activeOn: true, steps: true, activeOnRoutingForms: true },
    });
  }

  async updateRoutingFormTeamWorkflow(
    user: UserWithProfile,
    teamId: number,
    workflowId: number,
    data: TUpdateInputSchema
  ) {
    await updateWorkflow({
      ctx: {
        user: { ...user, locale: user?.locale ?? "en" },
        prisma: this.dbWrite.prisma as unknown as PrismaClient,
      },
      input: data,
    });

    const workflow = await this.getRoutingFormTeamWorkflowById(teamId, workflowId);
    return workflow;
  }

  async updateEventTypeTeamWorkflow(
    user: UserWithProfile,
    teamId: number,
    workflowId: number,
    data: TUpdateInputSchema
  ) {
    await updateWorkflow({
      ctx: {
        user: { ...user, locale: user?.locale ?? "en" },
        prisma: this.dbWrite.prisma as unknown as PrismaClient,
      },
      input: data,
    });

    const workflow = await this.getEventTypeTeamWorkflowById(teamId, workflowId);
    return workflow;
  }
}
