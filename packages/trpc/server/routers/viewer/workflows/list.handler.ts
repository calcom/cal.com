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
  const workflows: WorkflowType[] = [];

  const org = await prisma.team.findFirst({
    where: {
      isOrganization: true,
      children: {
        some: {
          id: input?.teamId,
        },
      },
      members: {
        some: {
          userId: input?.userId || ctx.user.id,
          accepted: true,
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (org) {
    const activeOrgWorkflows = await prisma.workflow.findMany({
      where: {
        team: {
          id: org.id,
          members: {
            some: {
              userId: ctx.user.id,
              accepted: true,
            },
          },
        },
        OR: [
          {
            isActiveOnAll: true,
          },
          {
            activeOnTeams: {
              some: {
                team: {
                  OR: [
                    { id: input?.teamId },
                    {
                      members: {
                        some: {
                          userId: ctx.user.id,
                          accepted: true,
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        ],
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
      },
    });
    workflows.push(
      ...activeOrgWorkflows.map((workflow) => {
        return { ...workflow, isOrg: true, readOnly: true };
      })
    );
  }

  if (input && input.teamId) {
    const teamWorkflows: WorkflowType[] = await prisma.workflow.findMany({
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
    const workflowsWithReadOnly = teamWorkflows.map((workflow) => {
      const readOnly = !!workflow.team?.members?.find(
        (member) => member.userId === ctx.user.id && member.role === MembershipRole.MEMBER
      );
      return { ...workflow, readOnly };
    });

    workflows.push(...workflowsWithReadOnly);

    return { workflows };
  }

  if (input && input.userId) {
    const userWorkflows: WorkflowType[] = await prisma.workflow.findMany({
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

    workflows.push(...userWorkflows);

    return { workflows };
  }

  const allWorkflows = await prisma.workflow.findMany({
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

  const workflowsWithReadOnly: WorkflowType[] = allWorkflows.map((workflow) => {
    const readOnly = !!workflow.team?.members?.find(
      (member) => member.userId === ctx.user.id && member.role === MembershipRole.MEMBER
    );

    return { readOnly, ...workflow };
  });

  workflows.push(...workflowsWithReadOnly);

  return { workflows };
};
