import { FORM_TRIGGER_WORKFLOW_EVENTS } from "@calcom/ee/workflows/lib/constants";
import { deleteScheduledAIPhoneCall } from "@calcom/ee/workflows/lib/reminders/aiPhoneCallManager";
import { deleteScheduledEmailReminder } from "@calcom/ee/workflows/lib/reminders/emailReminderManager";
import { deleteScheduledSMSReminder } from "@calcom/ee/workflows/lib/reminders/smsReminderManager";
import type { WorkflowStep, WorkflowListType as WorkflowType } from "@calcom/ee/workflows/lib/types";
import { hasFilter } from "@calcom/features/filters/lib/hasFilter";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import {
  MembershipRole,
  WorkflowType as PrismaWorkflowType,
  type TimeUnit,
  WorkflowMethods,
  type WorkflowTriggerEvents,
} from "@calcom/prisma/enums";
import type { TFilteredListInputSchema } from "@calcom/trpc/server/routers/viewer/workflows/filteredList.schema";
import type { TGetVerifiedEmailsInputSchema } from "@calcom/trpc/server/routers/viewer/workflows/getVerifiedEmails.schema";
import type { TGetVerifiedNumbersInputSchema } from "@calcom/trpc/server/routers/viewer/workflows/getVerifiedNumbers.schema";
import { z } from "zod";

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

type EventTypeWithChildrenCount = {
  id: number;
  title: string;
  parentId: number | null;
  _count: { children: number };
};

/**
 * Fetches event types with their children count using an optimized raw SQL query.
 * This query uses the parentId index instead of doing a full table scan.
 */
async function getEventTypesWithChildrenCount(ids: number[]): Promise<Map<number, EventTypeWithChildrenCount>> {
  if (ids.length === 0) {
    return new Map();
  }

  const result = await prisma.$queryRaw<
    { id: number; title: string; parentId: number | null; _aggr_count_children: bigint }[]
  >`
    SELECT 
      et."id", 
      et."title", 
      et."parentId", 
      COALESCE(child_counts.children_count, 0) AS "_aggr_count_children"
    FROM "public"."EventType" et
    LEFT JOIN (
      SELECT "parentId", COUNT(*) AS children_count 
      FROM "public"."EventType" 
      WHERE "parentId" = ANY(${ids}::int[])
      GROUP BY "parentId"
    ) AS child_counts ON et."id" = child_counts."parentId"
    WHERE et."id" = ANY(${ids}::int[])
  `;

  const eventTypeMap = new Map<number, EventTypeWithChildrenCount>();
  for (const row of result) {
    eventTypeMap.set(row.id, {
      id: row.id,
      title: row.title,
      parentId: row.parentId,
      _count: { children: Number(row._aggr_count_children) },
    });
  }
  return eventTypeMap;
}

const includedFields = {
  activeOn: {
    select: {
      eventType: {
        select: {
          id: true,
          title: true,
          parentId: true,
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

type ActiveOnEventType = {
  eventType: {
    id: number;
    title: string;
    parentId: number | null;
  };
};

type ActiveOnEventTypeWithCount = {
  eventType: EventTypeWithChildrenCount;
};

type EnrichActiveOn<T> = T extends { activeOn: ActiveOnEventType[] }
  ? Omit<T, "activeOn"> & { activeOn: ActiveOnEventTypeWithCount[] }
  : T extends { activeOn?: ActiveOnEventType[] }
    ? Omit<T, "activeOn"> & { activeOn?: ActiveOnEventTypeWithCount[] }
    : T;

export class WorkflowRepository {
  private static log = logger.getSubLogger({ prefix: ["workflow"] });

  private static async enrichWorkflowsWithChildrenCount<
    T extends { activeOn?: ActiveOnEventType[] | ActiveOnEventType[] },
  >(workflows: T[]): Promise<EnrichActiveOn<T>[]> {
    const eventTypeIds = new Set<number>();
    for (const workflow of workflows) {
      if (workflow.activeOn) {
        for (const activeOn of workflow.activeOn) {
          eventTypeIds.add(activeOn.eventType.id);
        }
      }
    }

    const eventTypeMap = await getEventTypesWithChildrenCount(Array.from(eventTypeIds));

    return workflows.map((workflow) => ({
      ...workflow,
      activeOn: workflow.activeOn?.map((activeOn) => ({
        ...activeOn,
        eventType: eventTypeMap.get(activeOn.eventType.id) ?? {
          ...activeOn.eventType,
          _count: { children: 0 },
        },
      })),
    })) as EnrichActiveOn<T>[];
  }

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

    const permissionCheckService = new PermissionCheckService();
    const teamIdsWithWorkflowUpdatePermission = userId
      ? await permissionCheckService.getTeamIdsWithPermission({
          userId,
          permission: "workflow.update",
          fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
        })
      : [];

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
      const enrichedWorkflows = await WorkflowRepository.enrichWorkflowsWithChildrenCount(allWorkflows);
      const workflowsWithReadOnly: WorkflowType[] = enrichedWorkflows.map((workflow) => {
        const readOnly = workflow.teamId
          ? !teamIdsWithWorkflowUpdatePermission.includes(workflow.teamId)
          : false;

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

      const enrichedFilteredWorkflows =
        await WorkflowRepository.enrichWorkflowsWithChildrenCount(filteredWorkflows);
      const workflowsWithReadOnly: WorkflowType[] = enrichedFilteredWorkflows.map((workflow) => {
        const readOnly = workflow.teamId
          ? !teamIdsWithWorkflowUpdatePermission.includes(workflow.teamId)
          : false;

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
        WorkflowRepository.log.error(
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
    const workflows = await prisma.workflow.findMany({
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

    return await WorkflowRepository.enrichWorkflowsWithChildrenCount(workflows);
  }

  static async findUserWorkflows({
    userId,
    excludeFormTriggers,
  }: {
    userId: number;
    excludeFormTriggers: boolean;
  }) {
    const workflows = await prisma.workflow.findMany({
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

    return await WorkflowRepository.enrichWorkflowsWithChildrenCount(workflows);
  }

  static async findAllWorkflows({
    userId,
    excludeFormTriggers,
  }: {
    userId: number;
    excludeFormTriggers: boolean;
  }) {
    const workflows = await prisma.workflow.findMany({
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

    return await WorkflowRepository.enrichWorkflowsWithChildrenCount(workflows);
  }

  static async findWorkflowsActiveOnRoutingForm({routingFormId }: { routingFormId: string }) {
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
