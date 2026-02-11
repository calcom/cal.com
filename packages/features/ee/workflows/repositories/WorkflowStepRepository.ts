import type { Prisma, PrismaClient } from "@calcom/prisma/client";

export class WorkflowStepRepository {
  constructor(private prismaClient: PrismaClient) {}

  async deleteById(id: number) {
    return await this.prismaClient.workflowStep.delete({
      where: { id },
    });
  }

  async createWorkflowStep(data: Prisma.WorkflowStepUncheckedCreateInput) {
    return await this.prismaClient.workflowStep.create({ data });
  }

  async updateWorkflowStep(id: number, data: Prisma.WorkflowStepUncheckedUpdateInput) {
    return await this.prismaClient.workflowStep.update({
      where: { id },
      data,
    });
  }
}
