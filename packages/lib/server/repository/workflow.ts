import type { CalIdWorkflowType } from "@calid/features/modules/workflows/config/types";
import type { CalIdWorkflowStep } from "@calid/features/modules/workflows/config/types";
import { deleteScheduledEmailReminder } from "@calid/features/modules/workflows/managers/emailManager";
import { deleteScheduledSMSReminder } from "@calid/features/modules/workflows/managers/smsManager";
import { deleteScheduledWhatsappReminder } from "@calid/features/modules/workflows/managers/whatsappManager";
import { z } from "zod";

import { hasFilter } from "@calcom/features/filters/lib/hasFilter";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/client";
import type { Prisma } from "@calcom/prisma/client";
import { WorkflowMethods } from "@calcom/prisma/enums";
import type { TFilteredListInputSchema } from "@calcom/trpc/server/routers/viewer/workflows/filteredList.schema";
import type { TGetVerifiedEmailsInputSchema } from "@calcom/trpc/server/routers/viewer/workflows/getVerifiedEmails.schema";
import type { TGetVerifiedNumbersInputSchema } from "@calcom/trpc/server/routers/viewer/workflows/getVerifiedNumbers.schema";

import logger from "../../logger";

export const ZGetInputSchema = z.object({
  id: z.number(),
});

export type TGetInputSchema = z.infer<typeof ZGetInputSchema>;

// const deleteScheduledWhatsappReminder = deleteScheduledSMSReminder;

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
        // isOrganization: true,
      },
    },
  },
} satisfies Prisma.CalIdWorkflowDefaultArgs;

export class WorkflowRepository {
  private static log = logger.getSubLogger({ prefix: ["workflow"] });

  static async getById({ id }: TGetInputSchema) {
    return await prisma.calIdWorkflow.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        userId: true,
        calIdTeamId: true,
        isActiveOnAll: true,
        calIdTeam: {
          select: {
            id: true,
            slug: true,
            members: true,
            name: true,
            // isOrganization: true,
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
            calIdTeam: true,
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
        OR: [{ userId }, { calIdTeamId: teamId }],
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

    const secondaryEmails = await prisma.secondaryEmail.findMany({
      where: {
        userId,
        emailVerified: {
          not: null,
        },
      },
    });
    verifiedEmails = verifiedEmails.concat(secondaryEmails.map((secondaryEmail) => secondaryEmail.email));
    if (teamId) {
      const teamMembers = await prisma.user.findMany({
        where: {
          teams: {
            some: {
              teamId,
            },
          },
        },
        select: {
          id: true,
          email: true,
          secondaryEmails: {
            where: {
              emailVerified: {
                not: null,
              },
            },
            select: {
              email: true,
            },
          },
        },
      });
      if (!teamMembers.length) {
        throw new Error("Team not found");
      }

      const isTeamMember = teamMembers.some((member) => member.id === userId);

      if (!isTeamMember) {
        throw new Error("You are not a member of this team");
      }

      teamMembers.forEach((member) => {
        if (member.id === userId) {
          return;
        }
        verifiedEmails.push(member.email);
        member.secondaryEmails.forEach((secondaryEmail) => {
          verifiedEmails.push(secondaryEmail.email);
        });
      });
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

    const allWorkflows = await prisma.calIdWorkflow.findMany({
      where: {
        OR: [
          {
            userId,
          },
          {
            calIdTeam: {
              members: {
                some: {
                  userId,
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
          id: "desc",
        },
      ],
    });

    if (!filtered) {
      const workflowsWithReadOnly: CalIdWorkflowType[] = allWorkflows.map((workflow) => {
        const readOnly = !!workflow.calIdTeam?.members?.find(
          (member) => member.userId === userId && member.role === MembershipRole.MEMBER
        );
        //TODO: TEAM_ORG
        return { readOnly, isOrg: false, ...workflow };

        // return { readOnly, isOrg: workflow.calIdTeam?.isOrganization ?? false, ...workflow };
      });

      return {
        filtered: workflowsWithReadOnly,
        totalCount: allWorkflows.length,
      };
    }

    const where = {
      OR: [] as Prisma.CalIdWorkflowWhereInput[],
    };

    if (filtered) {
      if (!!filters.teamIds) {
        where.OR.push({
          calIdTeam: {
            id: {
              in: filters.teamIds ?? [],
            },
            members: {
              some: {
                userId,
                acceptedInvitation: true,
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
          calIdTeamId: null,
        });
      }

      const filteredWorkflows = await prisma.calIdWorkflow.findMany({
        where,
        include: includedFields,
        orderBy: {
          id: "desc",
        },
      });

      const workflowsWithReadOnly: CalIdWorkflowType[] = filteredWorkflows.map((workflow) => {
        const readOnly = !!workflow.calIdTeam?.members?.find(
          (member) => member.userId === userId && member.role === MembershipRole.MEMBER
        );

        //TODO: TEAM_ORG
        return { readOnly, isOrg: false, ...workflow };
        // return { readOnly, isOrg: workflow.calIdTeam?.isOrganization ?? false, ...workflow };
      });

      return {
        filtered: workflowsWithReadOnly,
        totalCount: allWorkflows.length,
      };
    }
  }
  static async getRemindersFromRemovedTeams(
    removedTeams: number[],
    workflowSteps: CalIdWorkflowStep[],
    activeOn?: number[]
  ) {
    const remindersToDeletePromise: Prisma.PrismaPromise<
      {
        id: number;
        referenceId: string | null;
        method: string;
      }[]
    >[] = [];

    removedTeams.forEach((teamId) => {
      const reminderToDelete = prisma.calIdWorkflowReminder.findMany({
        where: {
          OR: [
            {
              //team event types + children managed event types
              booking: {
                eventType: {
                  OR: [{ teamId }, { teamId: null, parent: { teamId } }],
                },
              },
            },
            {
              // user bookings
              booking: {
                user: {
                  AND: [
                    // user is part of team that got removed
                    {
                      teams: {
                        some: {
                          teamId: teamId,
                        },
                      },
                    },
                    // and user is not part of any team were the workflow is still active on
                    {
                      teams: {
                        none: {
                          teamId: {
                            in: activeOn,
                          },
                        },
                      },
                    },
                  ],
                },
                eventType: {
                  teamId: null,
                  parentId: null, // children managed event types are handled above with team event types
                },
              },
            },
          ],
          workflowStepId: {
            in: workflowSteps.map((step) => {
              return step.id;
            }),
          },
        },
        select: {
          id: true,
          referenceId: true,
          method: true,
        },
      });

      remindersToDeletePromise.push(reminderToDelete);
    });
    const remindersToDelete = (await Promise.all(remindersToDeletePromise)).flat();
    return remindersToDelete;
  }

  static async deleteAllWorkflowReminders(
    remindersToDelete:
      | {
          id: number;
          referenceId: string | null;
          method: string;
        }[]
      | null
  ) {
    const reminderMethods: {
      [x: string]: (id: number, referenceId: string | null) => void;
    } = {
      [WorkflowMethods.EMAIL]: (id, referenceId) => deleteScheduledEmailReminder(id, referenceId),
      [WorkflowMethods.SMS]: (id, referenceId) => deleteScheduledSMSReminder(id, referenceId),
      [WorkflowMethods.WHATSAPP]: (id, referenceId) => deleteScheduledWhatsappReminder(id, referenceId),
    };

    if (!remindersToDelete) return Promise.resolve();

    const results = await Promise.allSettled(
      remindersToDelete.map((reminder) => {
        return reminderMethods[reminder.method](reminder.id, reminder.referenceId);
      })
    );

    results.forEach((result, index) => {
      if (result.status !== "fulfilled") {
        this.log.error(
          `An error occurred when deleting reminder ${remindersToDelete[index].id}, method: ${remindersToDelete[index].method}`,
          result.reason
        );
      }
    });
  }
}
