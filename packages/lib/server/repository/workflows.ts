import type { PrismaClient, Workflow, WorkflowStep } from "@prisma/client";
import { z } from "zod";

import { isSMSOrWhatsappAction } from "@calcom/ee/workflows/lib/actionHelperFunctions";
import {
  TIME_UNIT,
  WORKFLOW_ACTIONS,
  WORKFLOW_TEMPLATES,
  WORKFLOW_TRIGGER_EVENTS,
} from "@calcom/ee/workflows/lib/constants";
import { getAllWorkflows } from "@calcom/ee/workflows/lib/getAllWorkflows";
import type { Workflow as WorkflowType } from "@calcom/ee/workflows/lib/types";
import { SENDER_ID, SENDER_NAME } from "@calcom/lib/constants";
import type { Prisma } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import getOrgIdFromMemberOrTeamId from "../../getOrgIdFromMemberOrTeamId";

const ZWorkflow = z.object({
  id: z.number(),
  name: z.string(),
  trigger: z.enum(WORKFLOW_TRIGGER_EVENTS),
  time: z.number().nullable(),
  timeUnit: z.enum(TIME_UNIT).nullable(),
  userId: z.number().nullable(),
  teamId: z.number().nullable(),
  steps: z
    .object({
      id: z.number(),
      action: z.enum(WORKFLOW_ACTIONS),
      sendTo: z.string().nullable(),
      template: z.enum(WORKFLOW_TEMPLATES),
      reminderBody: z.string().nullable(),
      emailSubject: z.string().nullable(),
      numberRequired: z.boolean().nullable(),
      sender: z.string().nullable(),
      includeCalendarEvent: z.boolean(),
      numberVerificationPending: z.boolean(),
    })
    .array(),
});

export const ZWorkflows = z
  .object({
    workflow: ZWorkflow,
  })
  .array()
  .optional();

export const ZGetAllActiveWorkflowsInputSchema = z.object({
  eventType: z.object({
    id: z.number(),
    teamId: z.number().optional().nullable(),
    parent: z
      .object({
        id: z.number().nullable(),
        teamId: z.number().nullable(),
      })
      .optional()
      .nullable(),
    metadata: EventTypeMetaDataSchema,
    userId: z.number().optional().nullable(),
  }),
});

export type TGetAllActiveWorkflowsInputSchema = z.infer<typeof ZGetAllActiveWorkflowsInputSchema>;

export class WorkflowRepository {
  constructor(private prisma: PrismaClient) {}

  async verifyEmailSender(email: string, userId: number, teamId: number | null) {
    const verifiedEmail = await this.prisma.verifiedEmail.findFirst({
      where: {
        email,
        OR: [{ userId }, { teamId }],
      },
    });

    if (verifiedEmail) {
      if (teamId) {
        if (!verifiedEmail.teamId) {
          await this.prisma.verifiedEmail.update({
            where: { id: verifiedEmail.id },
            data: { teamId },
          });
        } else if (verifiedEmail.teamId !== teamId) {
          await this.prisma.verifiedEmail.create({
            data: { email, userId, teamId },
          });
        }
      }
      return;
    }

    const userEmail = await this.prisma.user.findFirst({
      where: { id: userId, email },
    });

    if (userEmail) {
      await this.prisma.verifiedEmail.create({
        data: { email, userId, teamId },
      });
      return;
    }

    if (teamId) {
      const team = await this.prisma.team.findFirst({
        where: { id: teamId },
        select: {
          members: {
            include: {
              user: { select: { id: true, email: true } },
            },
          },
        },
      });

      if (!team) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
      }

      const isTeamMember = team.members.some((member) => member.userId === userId);

      if (!isTeamMember) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this team" });
      }

      const teamMemberEmail = team.members.find((member) => member.user.email === email);

      if (teamMemberEmail) {
        await this.prisma.verifiedEmail.create({
          data: { email, userId, teamId },
        });
        return;
      }
    }

    throw new TRPCError({ code: "NOT_FOUND", message: "Email not verified" });
  }

  getSender(step: Pick<WorkflowStep, "action" | "sender"> & { senderName: string | null | undefined }) {
    return isSMSOrWhatsappAction(step.action) ? step.sender || SENDER_ID : step.senderName || SENDER_NAME;
  }

  async isAuthorized(workflow: Pick<Workflow, "id" | "teamId" | "userId"> | null, currentUserId: number) {
    if (!workflow) return false;

    const userWorkflow = await this.prisma.workflow.findFirst({
      where: {
        id: workflow.id,
        OR: [
          { userId: currentUserId },
          {
            team: {
              members: {
                some: {
                  userId: currentUserId,
                  accepted: true,
                },
              },
            },
          },
        ],
      },
    });

    return !!userWorkflow;
  }

  async getAllUserAndTeamEventTypes(teamIds: number[], notMemberOfTeamId: number[] = []) {
    const teamMembersWithEventTypes = await this.prisma.membership.findMany({
      where: {
        teamId: { in: teamIds },
        user: {
          teams: { none: { team: { id: { in: notMemberOfTeamId ?? [] } } } },
        },
      },
      select: {
        user: {
          select: {
            eventTypes: { select: { id: true } },
          },
        },
      },
    });

    const teamEventTypes = await this.prisma.eventType.findMany({
      where: { teamId: { in: teamIds } },
    });

    const userEventTypes = teamMembersWithEventTypes?.flatMap((membership) =>
      membership.user.eventTypes.map((et) => et.id)
    );

    return teamEventTypes.map((et) => et.id).concat(userEventTypes);
  }

  async isAuthorizedToAddActiveOnIds(
    newActiveIds: number[],
    isOrg: boolean,
    teamId?: number | null,
    userId?: number | null
  ) {
    for (const id of newActiveIds) {
      if (isOrg) {
        const newTeam = await this.prisma.team.findFirst({
          where: { id },
          select: { parent: true },
        });
        if (newTeam?.parent?.id !== teamId) {
          return false;
        }
      } else {
        const newEventType = await this.prisma.eventType.findFirst({
          where: { id },
          include: {
            users: { select: { id: true } },
            children: true,
          },
        });

        if (newEventType) {
          if (teamId && teamId !== newEventType.teamId) {
            return false;
          }
          if (
            !teamId &&
            userId &&
            newEventType.userId !== userId &&
            !newEventType?.users.find((eventTypeUser) => eventTypeUser.id === userId)
          ) {
            return false;
          }
        }
      }
    }
    return true;
  }

  async getRemindersFromRemovedTeams(
    removedTeams: number[],
    workflowSteps: WorkflowStep[],
    activeOn?: number[]
  ) {
    const remindersToDeletePromise = removedTeams.map((teamId) =>
      this.prisma.workflowReminder.findMany({
        where: {
          OR: [
            {
              booking: {
                eventType: {
                  OR: [{ teamId }, { teamId: null, parent: { teamId } }],
                },
              },
            },
            {
              booking: {
                user: {
                  AND: [
                    { teams: { some: { teamId: teamId } } },
                    { teams: { none: { teamId: { in: activeOn } } } },
                  ],
                },
                eventType: {
                  teamId: null,
                  parentId: null,
                },
              },
            },
          ],
          workflowStepId: { in: workflowSteps.map((step) => step.id) },
        },
        select: {
          id: true,
          referenceId: true,
          method: true,
        },
      })
    );

    return (await Promise.all(remindersToDeletePromise)).flat();
  }

  async getRemindersFromRemovedEventTypes(removedEventTypes: number[], workflowSteps: WorkflowStep[]) {
    const remindersToDeletePromise = removedEventTypes.map((eventTypeId) =>
      this.prisma.workflowReminder.findMany({
        where: {
          booking: { eventTypeId },
          workflowStepId: { in: workflowSteps.map((step) => step.id) },
        },
        select: {
          id: true,
          referenceId: true,
          method: true,
        },
      })
    );

    return (await Promise.all(remindersToDeletePromise)).flat();
  }

  async getBookingsForReminders(
    activeOn: number[],
    isOrg: boolean,
    alreadyScheduledActiveOnIds: number[] = []
  ) {
    if (activeOn.length === 0) return [];

    const whereClause = isOrg
      ? {
          OR: [
            {
              eventType: {
                OR: [{ teamId: { in: activeOn } }, { teamId: null, parent: { teamId: { in: activeOn } } }],
              },
            },
            {
              user: {
                teams: {
                  some: {
                    teamId: { in: activeOn },
                    accepted: true,
                  },
                },
              },
              eventType: {
                teamId: null,
                parentId: null,
              },
              NOT: {
                user: {
                  teams: {
                    some: {
                      teamId: { in: alreadyScheduledActiveOnIds },
                    },
                  },
                },
              },
            },
          ],
        }
      : {
          OR: [{ eventTypeId: { in: activeOn } }, { eventType: { parentId: { in: activeOn } } }],
        };

    return this.prisma.booking.findMany({
      where: {
        ...whereClause,
        status: BookingStatus.ACCEPTED,
        startTime: { gte: new Date() },
      },
      select: {
        // Add your booking select fields here
      },
    });
  }

  isStepEdited(oldStep: WorkflowStep, newStep: WorkflowStep) {
    const oldStepKeys = Object.keys(oldStep);
    const newStepKeys = Object.keys(newStep);

    if (oldStepKeys.length !== newStepKeys.length) {
      return true;
    }

    for (const key of oldStepKeys) {
      if (oldStep[key as keyof WorkflowStep] !== newStep[key as keyof WorkflowStep]) {
        return true;
      }
    }

    return false;
  }

  async getAllWorkflowsFromEventType(
    eventType: {
      workflows?: { workflow: WorkflowType }[];
      teamId?: number | null;
      parentId?: number | null;
      parent?: { id?: number | null; teamId: number | null } | null;
      metadata?: Prisma.JsonValue;
    } | null,
    userId?: number | null
  ) {
    if (!eventType) return [];

    const eventTypeWorkflows = eventType?.workflows?.map((workflowRel) => workflowRel.workflow) ?? [];

    const teamId = eventType?.teamId ?? eventType?.parent?.teamId ?? null;
    const orgId = await getOrgIdFromMemberOrTeamId({ memberId: userId, teamId });

    const isManagedEventType = !!eventType?.parent;
    const eventTypeMetadata = EventTypeMetaDataSchema.parse(eventType?.metadata || {});
    const workflowsLockedForUser = isManagedEventType
      ? !eventTypeMetadata?.managedEventConfig?.unlockedFields?.workflows
      : false;

    // Implement getAllWorkflows method or use appropriate repository method
    return getAllWorkflows(eventTypeWorkflows, userId, teamId, orgId, workflowsLockedForUser);
  }

  async getEventTypeWorkflows(userId: number, eventTypeId: number): Promise<z.infer<typeof ZWorkflows>> {
    const workflows = await this.prisma.workflow.findMany({
      where: {
        activeOn: {
          some: {
            eventTypeId: eventTypeId,
          },
        },
        OR: [
          { userId: userId },
          {
            team: {
              members: {
                some: {
                  userId: userId,
                },
              },
            },
          },
        ],
      },
      select: {
        name: true,
        id: true,
        trigger: true,
        time: true,
        timeUnit: true,
        userId: true,
        teamId: true,
        team: {
          select: {
            id: true,
            slug: true,
            name: true,
            members: true,
          },
        },
        activeOn: {
          where: {
            eventTypeId: eventTypeId,
          },
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
    });

    return workflows.map((workflow) => ({
      workflow: {
        ...workflow,
        activeOn: workflow.activeOn.map((activeOn) => activeOn.eventType),
      },
    }));
  }
}
