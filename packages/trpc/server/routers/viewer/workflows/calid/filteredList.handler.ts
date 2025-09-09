import { CalIdWorkflowRepository } from "@calcom/lib/server/repository/workflow.calid";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TCalIdFilteredListInputSchema } from "./filteredList.schema";

type CalIdFilteredListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TCalIdFilteredListInputSchema;
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
        calIdTeam: {
          select: {
            id: true,
            name: true,
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

export const calIdFilteredListHandler = async ({ ctx, input }: CalIdFilteredListOptions) => {
  return await CalIdWorkflowRepository.getFilteredList({ userId: ctx.user.id, input });
};
