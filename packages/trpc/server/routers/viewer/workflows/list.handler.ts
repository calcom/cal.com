import type { WorkflowType } from "@calcom/features/ee/workflows/components/WorkflowListPage";
// import dayjs from "@calcom/dayjs";
// import { getErrorFromUnknown } from "@calcom/lib/errors";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TListInputSchema } from "./list.schema";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListInputSchema;
};

export const listHandler = async ({ ctx, input }: ListOptions) => {
  if (input && input.teamId) {
    const workflows: WorkflowType[] = await prisma.workflow.findMany({
      where: {
        team: {
          id: input.teamId,
          members: {
            some: {
              userId: ctx.user.id,
              accepted: true,
            },
          },
        },
      },
      include: {
        team: {
          select: {
            id: true,
            slug: true,
            name: true,
            members: true,
          },
        },
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
      },
      orderBy: {
        id: "asc",
      },
    });
    const workflowsWithReadOnly = workflows.map((workflow) => {
      const readOnly = !!workflow.team?.members?.find(
        (member) => member.userId === ctx.user.id && member.role === MembershipRole.MEMBER
      );
      return { ...workflow, readOnly };
    });

    return { workflows: workflowsWithReadOnly };
  }

  if (input && input.userId) {
    const workflows: WorkflowType[] = await prisma.workflow.findMany({
      where: {
        userId: ctx.user.id,
      },
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
        team: {
          select: {
            id: true,
            slug: true,
            name: true,
            members: true,
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    return { workflows };
  }

  const workflows = await prisma.workflow.findMany({
    where: {
      OR: [
        { userId: ctx.user.id },
        {
          team: {
            members: {
              some: {
                userId: ctx.user.id,
                accepted: true,
              },
            },
          },
        },
      ],
    },
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
      team: {
        select: {
          id: true,
          slug: true,
          name: true,
          members: true,
        },
      },
    },
    orderBy: {
      id: "asc",
    },
  });

  const workflowsWithReadOnly: WorkflowType[] = workflows.map((workflow) => {
    const readOnly = !!workflow.team?.members?.find(
      (member) => member.userId === ctx.user.id && member.role === MembershipRole.MEMBER
    );

    return { readOnly, ...workflow };
  });

  return { workflows: workflowsWithReadOnly };
};
