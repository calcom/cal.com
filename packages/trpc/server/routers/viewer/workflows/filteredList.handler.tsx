import { WorkflowRepository } from "@calcom/features/ee/workflows/repositories/WorkflowRepository";
import { addPermissionsToWorkflows } from "@calcom/lib/server/repository/workflow-permissions";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TFilteredListInputSchema } from "./filteredList.schema";

type FilteredListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TFilteredListInputSchema;
};

const { include: includedFields } = {
  include: {
    activeOn: {
      select: {
        eventType: {
          select: {
            id: true,
            title: true,
            parentId: true,
            _count: {
              select: {
                children: true,
              },
            },
          },
        },
      },
    },
    activeOnTeams: {
      select: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    },
    steps: true,
    team: {
      select: {
        id: true,
        slug: true,
        name: true,
        members: true,
        logoUrl: true,
        isOrganization: true,
      },
    },
  },
} satisfies Prisma.WorkflowDefaultArgs;

export const filteredListHandler = async ({ ctx, input }: FilteredListOptions) => {
  const result = await WorkflowRepository.getFilteredList({ userId: ctx.user.id, input });

  if (!result) {
    return result;
  }

  // Add permissions to each workflow
  const workflowsWithPermissions = await addPermissionsToWorkflows(result.filtered, ctx.user.id);

  const filteredWorkflows = workflowsWithPermissions.filter((workflow) => workflow.permissions.canView);

  return {
    ...result,
    filtered: filteredWorkflows,
  };
};
