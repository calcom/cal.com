import { WorkflowRepository } from "@calcom/lib/server/repository/workflow";
import type { PrismaClient } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TFilteredListInputSchema } from "./filteredList.schema";

type FilteredListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TFilteredListInputSchema;
};

const { include: includedFields } = Prisma.validator<Prisma.WorkflowDefaultArgs>()({
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
});

export const filteredListHandler = async ({ ctx, input }: FilteredListOptions) => {
  return await WorkflowRepository.getFilteredList({ userId: ctx.user.id, input });
};
