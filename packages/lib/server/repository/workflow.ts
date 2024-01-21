import type { Prisma, Workflow as PrismaWorkflowType } from "@prisma/client";

import prisma from "@calcom/prisma";
import type { Ensure } from "@calcom/types/utils";

type IWorkflow = Ensure<
  Partial<
    Prisma.WorkflowCreateInput & {
      userId: PrismaWorkflowType["userId"];
      profileId: PrismaWorkflowType["profileId"];
      teamId: PrismaWorkflowType["teamId"];
    }
  >,
  "name" | "trigger"
>;
export class WorkflowRepository {
  static async create(data: IWorkflow) {
    const { userId, profileId, teamId, ...rest } = data;
    return await prisma.workflow.create({
      data: {
        ...rest,
        time: 24,
        ...(userId ? { owner: { connect: { id: userId } } } : null),
        ...(profileId
          ? {
              profile: {
                connect: {
                  id: profileId,
                },
              },
            }
          : null),
        ...(teamId ? { team: { connect: { id: teamId } } } : null),
      },
    });
  }
}
