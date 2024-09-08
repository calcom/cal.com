import { z } from "zod";

import prisma from "@calcom/prisma";

export const ZGetInputSchema = z.object({
  id: z.number(),
});

export type TGetInputSchema = z.infer<typeof ZGetInputSchema>;

export class WorkflowRepository {
  static async getById({ id }: TGetInputSchema) {
    return await prisma.workflow.findFirst({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        userId: true,
        teamId: true,
        isActiveOnAll: true,
        team: {
          select: {
            id: true,
            slug: true,
            members: true,
            name: true,
            isOrganization: true,
          },
        },
        time: true,
        timeUnit: true,
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
        trigger: true,
        steps: {
          orderBy: {
            stepNumber: "asc",
          },
        },
      },
    });
  }
}
