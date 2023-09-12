import type { WorkflowType } from "@calcom/ee/workflows/components/WorkflowListPage";
import { hasFilter } from "@calcom/features/filters/lib/hasFilter";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TFilteredListInputSchema } from "./filteredList.schema";

type FilteredListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TFilteredListInputSchema;
};

const includedFields = {
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
  steps: true,
  team: {
    select: {
      id: true,
      slug: true,
      name: true,
      members: true,
      logo: true,
    },
  },
};

export const filteredListHandler = async ({ ctx, input }: FilteredListOptions) => {
  const { prisma, user } = ctx;

  const filters = input?.filters;

  const filtered = filters && hasFilter(filters);

  const allWorkflows = await prisma.workflow.findMany({
    where: {
      OR: [
        {
          userId: user.id,
        },
        {
          team: {
            members: {
              some: {
                userId: user.id,
                accepted: true,
              },
            },
          },
        },
      ],
    },
    include: includedFields,
    orderBy: [
      {
        position: "desc",
      },
      {
        id: "asc",
      },
    ],
  });

  if (!filtered) {
    const workflowsWithReadOnly: WorkflowType[] = allWorkflows.map((workflow) => {
      const readOnly = !!workflow.team?.members?.find(
        (member) => member.userId === ctx.user.id && member.role === MembershipRole.MEMBER
      );

      return { readOnly, ...workflow };
    });

    return {
      filtered: workflowsWithReadOnly,
      totalCount: allWorkflows.length,
    };
  }

  const where = {
    OR: [] as Prisma.WorkflowWhereInput[],
  };

  if (filtered) {
    if (!!filters.teamIds) {
      where.OR.push({
        team: {
          id: {
            in: filters.teamIds ?? [],
          },
          members: {
            some: {
              userId: user.id,
              accepted: true,
            },
          },
        },
      });
    }

    if (!!filters.userIds) {
      where.OR.push({
        userId: {
          in: filters.userIds,
        },
        teamId: null,
      });
    }

    const filteredWorkflows = await prisma.workflow.findMany({
      where,
      include: includedFields,
      orderBy: {
        id: "asc",
      },
    });

    const workflowsWithReadOnly: WorkflowType[] = filteredWorkflows.map((workflow) => {
      const readOnly = !!workflow.team?.members?.find(
        (member) => member.userId === ctx.user.id && member.role === MembershipRole.MEMBER
      );

      return { readOnly, ...workflow };
    });

    return {
      filtered: workflowsWithReadOnly,
      totalCount: allWorkflows.length,
    };
  }
};
