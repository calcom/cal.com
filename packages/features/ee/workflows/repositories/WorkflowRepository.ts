import { z } from "zod";

import type { WorkflowType } from "@calcom/ee/workflows/components/WorkflowListPage";
import { FORM_TRIGGER_WORKFLOW_EVENTS } from "@calcom/ee/workflows/lib/constants";
import { deleteScheduledAIPhoneCall } from "@calcom/ee/workflows/lib/reminders/aiPhoneCallManager";
import { deleteScheduledEmailReminder } from "@calcom/ee/workflows/lib/reminders/emailReminderManager";
import { deleteScheduledSMSReminder } from "@calcom/ee/workflows/lib/reminders/smsReminderManager";
import type { WorkflowStep } from "@calcom/ee/workflows/lib/types";
import { hasFilter } from "@calcom/features/filters/lib/hasFilter";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import {
  MembershipRole,
  TimeUnit,
  WorkflowTriggerEvents,
  WorkflowType as PrismaWorkflowType,
} from "@calcom/prisma/enums";
import { WorkflowMethods } from "@calcom/prisma/enums";
import type { TFilteredListInputSchema } from "@calcom/trpc/server/routers/viewer/workflows/filteredList.schema";
import type { TGetVerifiedEmailsInputSchema } from "@calcom/trpc/server/routers/viewer/workflows/getVerifiedEmails.schema";
import type { TGetVerifiedNumbersInputSchema } from "@calcom/trpc/server/routers/viewer/workflows/getVerifiedNumbers.schema";

export const ZGetInputSchema = z.object({
  id: z.number(),
});

const excludeFormTriggersWhereClause = {
  trigger: {
    not: {
      in: FORM_TRIGGER_WORKFLOW_EVENTS,
    },
  },
};

const getWorkflowType = (trigger: WorkflowTriggerEvents): PrismaWorkflowType => {
  if (FORM_TRIGGER_WORKFLOW_EVENTS.includes(trigger)) {
    return PrismaWorkflowType.ROUTING_FORM;
  }
  return PrismaWorkflowType.EVENT_TYPE;
};

export type TGetInputSchema = z.infer<typeof ZGetInputSchema>;

const deleteScheduledWhatsappReminder = deleteScheduledSMSReminder;

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
} satisfies Prisma.WorkflowInclude;

export class WorkflowRepository {
  private static log = logger.getSubLogger({ prefix: ["workflow"] });

  static async getById({ id }: TGetInputSchema) {
    return await prisma.workflow.findUnique({
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
        activeOnRoutingForms: {
          select: {
            routingForm: {
              select: {
                id: true,
                name: true,
              },
            },
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
          id: "desc",
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
      if (filters.teamIds) {
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

      if (filters.userIds) {
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
          id: "desc",
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
  static async getRemindersFromRemovedTeams(
    removedTeams: number[],
    workflowSteps: WorkflowStep[],
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
      const reminderToDelete = prisma.workflowReminder.findMany({
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

  static async getActiveOnEventTypeIds({
    workflowId,
    userId,
    teamId,
  }: {
    workflowId: number;
    userId: number;
    teamId?: number | null;
  }) {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        userId,
        teamId: teamId ?? undefined,
      },
      select: {
        activeOn: {
          select: {
            eventTypeId: true,
          },
        },
      },
    });

    if (!workflow) {
      throw new HttpError({
        statusCode: 404,
        message: "Workflow not found",
      });
    }

    return workflow.activeOn.map((active) => active.eventTypeId);
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
      [WorkflowMethods.EMAIL]: (id) => deleteScheduledEmailReminder(id),
      [WorkflowMethods.SMS]: (id, referenceId) => deleteScheduledSMSReminder(id, referenceId),
      [WorkflowMethods.WHATSAPP]: (id, referenceId) => deleteScheduledWhatsappReminder(id, referenceId),
      [WorkflowMethods.AI_PHONE_CALL]: (id, referenceId) => deleteScheduledAIPhoneCall(id, referenceId),
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

  static async findUniqueForUpdate(id: number) {
    return await prisma.workflow.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        isActiveOnAll: true,
        trigger: true,
        time: true,
        timeUnit: true,
        team: {
          select: {
            isOrganization: true,
          },
        },
        teamId: true,
        user: {
          select: {
            teams: true,
          },
        },
        steps: true,
        activeOn: true,
        activeOnTeams: true,
        activeOnRoutingForms: true,
      },
    });
  }

  static async updateWorkflow(
    id: number,
    data: {
      name: string;
      trigger: WorkflowTriggerEvents;
      time: number | null;
      timeUnit: TimeUnit | null;
      isActiveOnAll?: boolean;
    }
  ) {
    const type = getWorkflowType(data.trigger);
    return await prisma.workflow.update({
      where: { id },
      data: {
        ...data,
        type,
      },
    });
  }

  static async findUniqueWithRelations(id: number) {
    return await prisma.workflow.findUnique({
      where: { id },
      include: {
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
        activeOnRoutingForms: {
          select: {
            routingForm: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        team: {
          select: {
            id: true,
            slug: true,
            members: true,
            name: true,
            isOrganization: true,
          },
        },
        steps: {
          orderBy: {
            stepNumber: "asc",
          },
        },
      },
    });
  }

  static async findActiveOrgWorkflows({
    orgId,
    userId,
    teamId,
    excludeFormTriggers,
  }: {
    orgId: number;
    userId: number;
    teamId: number;
    excludeFormTriggers: boolean;
  }) {
    return await prisma.workflow.findMany({
      where: {
        ...(excludeFormTriggers ? excludeFormTriggersWhereClause : {}),
        team: {
          id: orgId,
          members: {
            some: {
              userId,
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
                    { id: teamId },
                    {
                      members: {
                        some: {
                          userId,
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
  }

  static async findTeamWorkflows({
    teamId,
    userId,
    excludeFormTriggers,
  }: {
    teamId: number;
    userId: number;
    excludeFormTriggers: boolean;
  }) {
    return await prisma.workflow.findMany({
      where: {
        ...(excludeFormTriggers ? excludeFormTriggersWhereClause : {}),
        team: {
          id: teamId,
          members: {
            some: {
              userId,
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
  }

  static async findUserWorkflows({
    userId,
    excludeFormTriggers,
  }: {
    userId: number;
    excludeFormTriggers: boolean;
  }) {
    return await prisma.workflow.findMany({
      where: {
        ...(excludeFormTriggers ? excludeFormTriggersWhereClause : {}),
        userId,
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
  }

  static async findAllWorkflows({
    userId,
    excludeFormTriggers,
  }: {
    userId: number;
    excludeFormTriggers: boolean;
  }) {
    return await prisma.workflow.findMany({
      where: {
        ...(excludeFormTriggers ? excludeFormTriggersWhereClause : {}),
        OR: [
          { userId },
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
  }

  static async findWorkflowsActiveOnRoutingForm({ routingFormId }: { routingFormId: string }) {
    return await prisma.workflow.findMany({
      where: {
        activeOnRoutingForms: {
          some: {
            routingFormId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        trigger: true,
        time: true,
        timeUnit: true,
        userId: true,
        teamId: true,
        steps: true,
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  static async findActiveWorkflowsOnTeam({ parentTeamId, teamId }: { parentTeamId: number; teamId: number }) {
    return await prisma.workflow.findMany({
      where: {
        teamId: parentTeamId,
        OR: [
          {
            activeOnTeams: {
              some: {
                teamId: teamId,
              },
            },
          },
          {
            isActiveOnAll: true,
          },
        ],
      },
      select: {
        steps: true,
        activeOnTeams: true,
        isActiveOnAll: true,
      },
    });
  }

  static bookingSelectForReminders = {
    userPrimaryEmail: true,
    startTime: true,
    endTime: true,
    title: true,
    uid: true,
    metadata: true,
    smsReminderNumber: true,
    responses: true,
    attendees: {
      select: {
        name: true,
        email: true,
        timeZone: true,
        locale: true,
      },
    },
    eventType: {
      select: {
        slug: true,
        id: true,
        schedulingType: true,
        hideOrganizerEmail: true,
        customReplyToEmail: true,
        hosts: {
          select: {
            user: {
              select: {
                email: true,
                destinationCalendar: {
                  select: {
                    primaryEmail: true,
                  },
                },
              },
            },
          },
        },
      },
    },
    user: {
      select: {
        name: true,
        timeZone: true,
        timeFormat: true,
        locale: true,
        email: true,
      },
    },
  };
}
