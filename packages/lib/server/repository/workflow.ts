import { z } from "zod";

import type { WorkflowType } from "@calcom/ee/workflows/components/WorkflowListPage";
import { hasFilter } from "@calcom/features/filters/lib/hasFilter";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/client";
import { Prisma } from "@calcom/prisma/client";
import type { TFilteredListInputSchema } from "@calcom/trpc/server/routers/viewer/workflows/filteredList.schema";
import type { TGetVerifiedEmailsInputSchema } from "@calcom/trpc/server/routers/viewer/workflows/getVerifiedEmails.schema";
import type { TGetVerifiedNumbersInputSchema } from "@calcom/trpc/server/routers/viewer/workflows/getVerifiedNumbers.schema";

export const ZGetInputSchema = z.object({
  id: z.number(),
});

export type TGetInputSchema = z.infer<typeof ZGetInputSchema>;

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

  static async getVerifiedNumbers({
    userId,
    teamId,
  }: TGetVerifiedNumbersInputSchema & { userId: number | null }) {
    if (!userId) {
      throw new Error("User Id not found");
    }
    const verifiedNumbers = await prisma.verifiedNumber.findMany({
      where: {
        OR: [{ userId }, { teamId }],
      },
    });

    return verifiedNumbers;
  }

  static async getVerifiedEmails({
    userEmail,
    userId,
    teamId,
  }: TGetVerifiedEmailsInputSchema & { userEmail: string | null; userId: number | null }) {
    if (!userId) {
      throw new Error("User Id not found");
    }
    if (!userEmail) {
      throw new Error("User email not found");
    }

    let verifiedEmails: string[] = [userEmail];

    if (teamId) {
      const team = await prisma.team.findFirst({
        where: {
          id: teamId,
        },
        select: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!team) {
        throw new Error("Team not found");
      }

      const isTeamMember = team.members.some((member) => member.userId === userId);

      if (!isTeamMember) {
        throw new Error("You are not a member of this team");
      }

      verifiedEmails = verifiedEmails.concat(team.members.map((member) => member.user.email));
    }

    const emails = (
      await prisma.verifiedEmail.findMany({
        where: {
          OR: [{ userId }, { teamId }],
        },
      })
    ).map((verifiedEmail) => verifiedEmail.email);

    verifiedEmails = verifiedEmails.concat(emails);

    return verifiedEmails;
  }

  static async getFilteredList({ userId, input }: { userId?: number; input: TFilteredListInputSchema }) {
    const filters = input?.filters;

    const filtered = filters && hasFilter(filters);

    const allWorkflows = await prisma.workflow.findMany({
      where: {
        OR: [
          {
            userId,
          },
          {
            team: {
              members: {
                some: {
                  userId,
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
          (member) => member.userId === userId && member.role === MembershipRole.MEMBER
        );

        return { readOnly, isOrg: workflow.team?.isOrganization ?? false, ...workflow };
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
                userId,
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
          (member) => member.userId === userId && member.role === MembershipRole.MEMBER
        );

        return { readOnly, isOrg: workflow.team?.isOrganization ?? false, ...workflow };
      });

      return {
        filtered: workflowsWithReadOnly,
        totalCount: allWorkflows.length,
      };
    }
  }
}
