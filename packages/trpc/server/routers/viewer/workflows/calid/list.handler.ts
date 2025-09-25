// import dayjs from "@calcom/dayjs";
// import { getErrorFromUnknown } from "@calcom/lib/errors";
import type { CalIdWorkflowType } from "@calid/features/modules/workflows/config/types";

import { prisma } from "@calcom/prisma";
import { CalIdMembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TCalIdListInputSchema } from "./list.schema";

type CalIdListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCalIdListInputSchema;
};

export const calIdListHandler = async ({ ctx, input }: CalIdListOptions) => {
  const workflows: CalIdWorkflowType[] = [];

  if (input && input.calIdTeamId) {
    const calIdTeamWorkflows: CalIdWorkflowType[] = await prisma.calIdWorkflow.findMany({
      where: {
        calIdTeam: {
          id: input.calIdTeamId,
          members: {
            some: {
              userId: ctx.user.id,
              acceptedInvitation: true,
            },
          },
        },
      },
      include: {
        calIdTeam: {
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
    const workflowsWithReadOnly = calIdTeamWorkflows.map((workflow) => {
      const readOnly = !!workflow.calIdTeam?.members?.find(
        (member) => member.userId === ctx.user.id && member.role === CalIdMembershipRole.MEMBER
      );
      return { ...workflow, readOnly };
    });

    workflows.push(...workflowsWithReadOnly);

    return { workflows };
  }

  if (input && input.userId) {
    const userWorkflows: CalIdWorkflowType[] = await prisma.calIdWorkflow.findMany({
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
        calIdTeam: {
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

    workflows.push(...userWorkflows);

    return { workflows };
  }

  const allWorkflows = await prisma.calIdWorkflow.findMany({
    where: {
      OR: [
        { userId: ctx.user.id },
        {
          calIdTeam: {
            members: {
              some: {
                userId: ctx.user.id,
                acceptedInvitation: true,
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
      calIdTeam: {
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

  const workflowsWithReadOnly: CalIdWorkflowType[] = allWorkflows.map((workflow) => {
    const readOnly = !!workflow.calIdTeam?.members?.find(
      (member) => member.userId === ctx.user.id && member.role === CalIdMembershipRole.MEMBER
    );

    return { readOnly, ...workflow };
  });

  workflows.push(...workflowsWithReadOnly);

  return { workflows };
};
