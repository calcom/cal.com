import type { TFormSchema } from "@calcom/app-store/routing-forms/trpc/forms.schema";
import { hasFilter } from "@calcom/features/filters/lib/hasFilter";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { entries } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TCalIdWorkflowOrderInputSchema } from "./workflowOrder.schema";

type CalIdWorkflowOrderOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCalIdWorkflowOrderInputSchema;
};

export const calIdWorkflowOrderHandler = async ({ ctx, input }: CalIdWorkflowOrderOptions) => {
  const { user } = ctx;

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
      steps: true,
      calIdTeam: {
        select: {
          id: true,
          slug: true,
          name: true,
          members: true,
          logoUrl: true,
        },
      },
    },
  } satisfies Prisma.CalIdWorkflowDefaultArgs;

  const allWorkflows = await prisma.calIdWorkflow.findMany({
    where: {
      OR: [
        {
          userId: user.id,
        },
        {
          calIdTeam: {
            members: {
              some: {
                userId: user.id,
                acceptedInvitation: true,
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

  const allWorkflowIds = new Set(allWorkflows.map((workflow) => workflow.id));
  if (input.ids.some((id) => !allWorkflowIds.has(id))) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }

  await Promise.all(
    input.ids.reverse().map((id, position) => {
      return prisma.calIdWorkflow.update({
        where: {
          id: id,
        },
        data: {
          position,
        },
      });
    })
  );
};

type SupportedFilters = Omit<NonNullable<NonNullable<TFormSchema>["filters"]>, "upIds"> | undefined;

export function getCalIdPrismaWhereFromFilters(
  user: {
    id: number;
  },
  filters: SupportedFilters
) {
  const where = {
    OR: [] as Prisma.App_RoutingForms_FormWhereInput[],
  };

  const prismaQueries: Record<
    keyof NonNullable<typeof filters>,
    (...args: [number[]]) => Prisma.App_RoutingForms_FormWhereInput
  > & {
    all: () => Prisma.App_RoutingForms_FormWhereInput;
  } = {
    userIds: (userIds: number[]) => ({
      userId: {
        in: userIds,
      },
      calIdTeamId: null,
    }),
    calIdTeamIds: (calIdTeamIds: number[]) => ({
      calIdTeam: {
        id: {
          in: calIdTeamIds ?? [],
        },
        members: {
          some: {
            userId: user.id,
            acceptedInvitation: true,
          },
        },
      },
    }),
    teamIds: (teamIds: number[]) => ({
      calIdTeam: {
        id: {
          in: teamIds ?? [],
        },
        members: {
          some: {
            userId: user.id,
            acceptedInvitation: true,
          },
        },
      },
    }),
    all: () => ({
      OR: [
        {
          userId: user.id,
        },
        {
          calIdTeam: {
            members: {
              some: {
                userId: user.id,
                acceptedInvitation: true,
              },
            },
          },
        },
      ],
    }),
  };

  if (!filters || !hasFilter(filters)) {
    where.OR.push(prismaQueries.all());
  } else {
    for (const entry of entries(filters)) {
      if (!entry) {
        continue;
      }
      const [filterName, filter] = entry;
      const getPrismaQuery = prismaQueries[filterName];
      // filter might be accidentally set undefined as well
      if (!getPrismaQuery || !filter) {
        continue;
      }
      where.OR.push(getPrismaQuery(filter));
    }
  }

  return where;
}
