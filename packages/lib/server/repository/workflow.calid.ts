import type { CalIdWorkflowStep } from "@calid/features/modules/workflows/config/types";
import { deleteScheduledEmailReminder } from "@calid/features/modules/workflows/managers/emailManager";
import { deleteScheduledSMSReminder } from "@calid/features/modules/workflows/managers/smsManager";
import { deleteScheduledWhatsappReminder } from "@calid/features/modules/workflows/managers/whatsappManager";
import { z } from "zod";

import { hasFilter } from "@calcom/features/filters/lib/hasFilter";
import prisma from "@calcom/prisma";
import { CalIdMembershipRole } from "@calcom/prisma/client";
import type { Prisma } from "@calcom/prisma/client";
import { WorkflowMethods } from "@calcom/prisma/enums";
import type { TCalIdFilteredListInputSchema } from "@calcom/trpc/server/routers/viewer/workflows/calid/filteredList.schema";
import type { TCalIdGetVerifiedEmailsInputSchema } from "@calcom/trpc/server/routers/viewer/workflows/calid/getVerifiedEmails.schema";
import type { TCalIdGetVerifiedNumbersInputSchema } from "@calcom/trpc/server/routers/viewer/workflows/calid/getVerifiedNumbers.schema";

import logger from "../../logger";

export const ZCalIdGetInputSchema = z.object({
  id: z.number(),
});

export type TCalIdGetInputSchema = z.infer<typeof ZCalIdGetInputSchema>;

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

export class CalIdWorkflowRepository {
  private static log = logger.getSubLogger({ prefix: ["calIdWorkflow"] });

  static async getById({ id }: TCalIdGetInputSchema) {
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
    calIdTeamId,
  }: TCalIdGetVerifiedNumbersInputSchema & { userId: number | null }) {
    if (!userId) {
      throw new Error("User Id not found");
    }
    const verifiedNumbers = await prisma.verifiedNumber.findMany({
      where: {
        OR: [{ userId }, { calIdTeamId }],
      },
    });

    return verifiedNumbers;
  }

  static async getVerifiedEmails({
    userEmail,
    userId,
    calIdTeamId,
  }: TCalIdGetVerifiedEmailsInputSchema & { userEmail: string | null; userId: number | null }) {
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

    if (calIdTeamId) {
      const calIdTeamMembers = await prisma.user.findMany({
        where: {
          calIdTeams: {
            some: {
              calIdTeamId,
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
      if (!calIdTeamMembers.length) {
        throw new Error("CalId Team not found");
      }

      const isTeamMember = calIdTeamMembers.some((member) => member.id === userId);

      if (!isTeamMember) {
        throw new Error("You are not a member of this CalId team");
      }

      calIdTeamMembers.forEach((member) => {
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
          OR: [{ userId }, { calIdTeamId }],
        },
      })
    ).map((verifiedEmail) => verifiedEmail.email);

    verifiedEmails = verifiedEmails.concat(emails);

    return verifiedEmails;
  }

  static async getFilteredList({ userId, input }: { userId?: number; input: TCalIdFilteredListInputSchema }) {
    const filters = input?.filters;
    const filtered = filters && hasFilter(filters);

    // Build base WHERE clause for workflows accessible by the user
    const baseWhere: Prisma.CalIdWorkflowWhereInput = {
      OR: [
        { userId },
        {
          calIdTeam: {
            members: { some: { userId, acceptedInvitation: true } },
          },
        },
      ],
    };

    // Fetch all workflows (needed for totalCount)
    const allWorkflows = await prisma.calIdWorkflow.findMany({
      where: baseWhere,
      include: includedFields,
      orderBy: [{ position: "desc" }, { id: "desc" }],
    });

    const memberships = await prisma.calIdMembership.findMany({
      where: { userId, acceptedInvitation: true },
      select: {
        role: true,
        calIdTeam: {
          select: {
            id: true,
            slug: true,
            name: true,
            // members: true,
            logoUrl: true,
          },
        },
      },
    });

    // Helper function to mark readOnly and extract unique teams
    const mapWorkflows = (workflows: typeof allWorkflows) => {
      const mapped = workflows.map((workflow) => {
        const readOnly = !!workflow.calIdTeam?.members?.some(
          (member) => member.userId === userId && member.role === CalIdMembershipRole.MEMBER
        );
        return { readOnly, ...workflow };
      });
      return { workflows: mapped };
    };

    if (!filtered) {
      return {
        filtered: mapWorkflows(allWorkflows).workflows,
        totalCount: allWorkflows.length,
        teams: memberships.map((m) => ({ ...m.calIdTeam, role: m.role })),
      };
    }

    // Build filtered WHERE clause
    const where: Prisma.CalIdWorkflowWhereInput = { OR: [] };
    if (filters?.calIdTeamIds?.length) {
      where.OR?.push({
        calIdTeam: {
          id: { in: filters.calIdTeamIds },
          members: { some: { userId, acceptedInvitation: true } },
        },
      });
    }
    if (filters?.userIds?.length) {
      where.OR?.push({
        userId: { in: filters.userIds },
        calIdTeamId: null,
      });
    }

    const filteredWorkflows = await prisma.calIdWorkflow.findMany({
      where,
      include: includedFields,
      orderBy: { id: "desc" },
    });

    const { workflows: filteredWorkflowsWithReadOnly } = mapWorkflows(filteredWorkflows);

    return {
      filtered: filteredWorkflowsWithReadOnly,
      totalCount: allWorkflows.length,
      teams: memberships.map((m) => ({ ...m.calIdTeam, role: m.role })),
    };
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

    removedTeams.forEach((calIdTeamId) => {
      const reminderToDelete = prisma.calIdWorkflowReminder.findMany({
        where: {
          OR: [
            {
              // CalId team event types + children managed event types
              booking: {
                eventType: {
                  OR: [{ calIdTeamId }, { calIdTeamId: null, parent: { calIdTeamId } }],
                },
              },
            },
            {
              // user bookings
              booking: {
                user: {
                  AND: [
                    // user is part of CalId team that got removed
                    {
                      calIdTeams: {
                        some: {
                          calIdTeamId: calIdTeamId,
                        },
                      },
                    },
                    // and user is not part of any CalId team where the workflow is still active on
                    {
                      calIdTeams: {
                        none: {
                          calIdTeamId: {
                            in: activeOn,
                          },
                        },
                      },
                    },
                  ],
                },
                eventType: {
                  calIdTeamId: null,
                  parentId: null, // children managed event types are handled above with CalId team event types
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
          `An error occurred when deleting CalId workflow reminder ${remindersToDelete[index].id}, method: ${remindersToDelete[index].method}`,
          result.reason
        );
      }
    });
  }
}
