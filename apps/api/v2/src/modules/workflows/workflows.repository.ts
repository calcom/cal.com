import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Injectable } from "@nestjs/common";
import { TimeUnit, Workflow, WorkflowStep, WorkflowTriggerEvents } from "@prisma/client";

import { TUpdateInputSchema } from "@calcom/platform-libraries/workflows";
import { updateWorkflow } from "@calcom/platform-libraries/workflows";
import { PrismaClient } from "@calcom/prisma";

export type WorkflowType = Workflow & { activeOn: { eventTypeId: number }[]; steps: WorkflowStep[] };

@Injectable()
export class WorkflowsRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async deleteTeamWorkflowById(teamId: number, workflowId: number) {
    return await this.dbWrite.prisma.workflow.delete({ where: { id: workflowId, teamId } });
  }

  async getTeamWorkflowById(teamId: number, id: number): Promise<WorkflowType | null> {
    const workflow = await this.dbRead.prisma.workflow.findUnique({
      where: {
        id: id,
        teamId: teamId,
      },
      include: {
        steps: true,
        activeOn: { select: { eventTypeId: true } },
      },
    });

    return workflow;
  }

  async getTeamWorkflows(teamId: number, skip: number, take: number): Promise<WorkflowType[]> {
    const workflows = await this.dbRead.prisma.workflow.findMany({
      where: {
        teamId: teamId,
      },
      include: {
        steps: true,
        activeOn: { select: { eventTypeId: true } },
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
      include: { activeOn: true, steps: true },
    });
  }

  async updateTeamWorkflow(
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

    const workflow = await this.getTeamWorkflowById(teamId, workflowId);
    return workflow;
  }
}
