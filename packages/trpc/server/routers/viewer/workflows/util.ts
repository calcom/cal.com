import type { z } from "zod";

import { isSMSOrWhatsappAction } from "@calcom/ee/workflows/lib/actionHelperFunctions";
import emailRatingTemplate from "@calcom/ee/workflows/lib/reminders/templates/emailRatingTemplate";
import emailReminderTemplate from "@calcom/ee/workflows/lib/reminders/templates/emailReminderTemplate";
import {
  getSmsReminderNumberField,
  getSmsReminderNumberSource,
  getAIAgentCallPhoneNumberField,
  getAIAgentCallPhoneNumberSource,
} from "@calcom/features/bookings/lib/getBookingFields";
import { WorkflowRepository } from "@calcom/features/ee/workflows/repositories/WorkflowRepository";
import { removeBookingField, upsertBookingField } from "@calcom/features/eventtypes/lib/bookingFieldsManager";
import { SMS_REMINDER_NUMBER_FIELD, CAL_AI_AGENT_PHONE_NUMBER_FIELD } from "@calcom/lib/bookings/SystemField";
import { SENDER_ID, SENDER_NAME } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import prisma from "@calcom/prisma";
import type { Prisma, WorkflowStep } from "@calcom/prisma/client";
import { WorkflowTemplates } from "@calcom/prisma/enums";
import { WorkflowActions } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { ZWorkflows } from "./getAllActiveWorkflows.schema";

// Re-export migrated functions from features layer for backward compatibility
export {
  isAuthorized,
  getAllWorkflowsFromEventType,
  scheduleWorkflowNotifications,
  scheduleBookingReminders,
} from "@calcom/features/ee/workflows/lib/workflowUtils";

export const bookingSelect = {
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

export const verifyEmailSender = async (email: string, userId: number, teamId: number | null) => {
  const verifiedEmail = await prisma.verifiedEmail.findFirst({
    where: {
      email,
      OR: [{ userId }, { teamId }],
    },
  });

  if (verifiedEmail) {
    if (teamId) {
      if (!verifiedEmail.teamId) {
        await prisma.verifiedEmail.update({
          where: {
            id: verifiedEmail.id,
          },
          data: {
            teamId,
          },
        });
      } else if (verifiedEmail.teamId !== teamId) {
        await prisma.verifiedEmail.create({
          data: {
            email,
            userId,
            teamId,
          },
        });
      }
    }
    return;
  }

  const userEmail = await prisma.user.findFirst({
    where: {
      id: userId,
      email,
    },
  });

  if (userEmail) {
    await prisma.verifiedEmail.create({
      data: {
        email,
        userId,
        teamId,
      },
    });
    return;
  }

  // Check if it's a verified secondary email of the user
  const secondaryEmail = await prisma.secondaryEmail.findFirst({
    where: {
      userId,
      email,
      emailVerified: {
        not: null,
      },
    },
  });

  if (secondaryEmail) {
    await prisma.verifiedEmail.create({
      data: {
        email,
        userId,
        teamId,
      },
    });
    return;
  }

  if (teamId) {
    const team = await prisma.team.findUnique({
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
                secondaryEmails: {
                  select: {
                    email: true,
                    emailVerified: true,
                  },
                },
              },
            },
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

    let foundTeamMember = team.members.find((member) => member.user.email === email);

    // Only check secondary emails if no match was found with primary email
    if (!foundTeamMember) {
      foundTeamMember = team.members.find((member) =>
        member.user.secondaryEmails.some(
          (secondary) => secondary.email === email && !!secondary.emailVerified
        )
      );
    }

    if (foundTeamMember) {
      await prisma.verifiedEmail.create({
        data: {
          email,
          userId,
          teamId,
        },
      });
      return;
    }
  }

  throw new TRPCError({ code: "NOT_FOUND", message: "Email not verified" });
};

export function getSender(
  step: Pick<WorkflowStep, "action" | "sender"> & { senderName: string | null | undefined }
) {
  return isSMSOrWhatsappAction(step.action) ? step.sender || SENDER_ID : step.senderName || SENDER_NAME;
}

export async function upsertSmsReminderFieldForEventTypes({
  activeOn,
  workflowId,
  isSmsReminderNumberRequired,
  isOrg,
}: {
  activeOn: number[];
  workflowId: number;
  isSmsReminderNumberRequired: boolean;
  isOrg: boolean;
}) {
  let allEventTypeIds = activeOn;

  if (isOrg) {
    allEventTypeIds = await getAllUserAndTeamEventTypes(activeOn);
  }

  for (const eventTypeId of allEventTypeIds) {
    await upsertBookingField(
      getSmsReminderNumberField(),
      getSmsReminderNumberSource({
        workflowId,
        isSmsReminderNumberRequired,
      }),
      eventTypeId
    );
  }
}

export async function removeSmsReminderFieldForEventTypes({
  activeOnToRemove,
  workflowId,
  isOrg,
  activeOn,
}: {
  activeOnToRemove: number[];
  workflowId: number;
  isOrg: boolean;
  activeOn?: number[];
}) {
  let allEventTypeIds = activeOnToRemove;

  if (isOrg) {
    allEventTypeIds = await getAllUserAndTeamEventTypes(activeOnToRemove, activeOn);
  }
  for (const eventTypeId of allEventTypeIds) {
    await removeSmsReminderFieldForEventType({
      workflowId,
      eventTypeId,
    });
  }
}

export async function removeSmsReminderFieldForEventType({
  workflowId,
  eventTypeId,
}: {
  workflowId: number;
  eventTypeId: number;
}) {
  await removeBookingField(
    {
      name: SMS_REMINDER_NUMBER_FIELD,
    },
    {
      id: `${workflowId}`,
      type: "workflow",
    },
    eventTypeId
  );
}

export async function upsertAIAgentCallPhoneNumberFieldForEventTypes({
  activeOn,
  workflowId,
  isAIAgentCallPhoneNumberRequired,
  isOrg,
}: {
  activeOn: number[];
  workflowId: number;
  isAIAgentCallPhoneNumberRequired?: boolean;
  isOrg: boolean;
}) {
  let allEventTypeIds = activeOn;

  if (isOrg) {
    allEventTypeIds = await getAllUserAndTeamEventTypes(activeOn);
  }

  for (const eventTypeId of allEventTypeIds) {
    await upsertBookingField(
      getAIAgentCallPhoneNumberField(),
      getAIAgentCallPhoneNumberSource({
        workflowId,
        isAIAgentCallPhoneNumberRequired: isAIAgentCallPhoneNumberRequired ?? false,
      }),
      eventTypeId
    );
  }
}

export async function removeAIAgentCallPhoneNumberFieldForEventTypes({
  activeOnToRemove,
  workflowId,
  isOrg,
  activeOn,
}: {
  activeOnToRemove: number[];
  workflowId: number;
  isOrg: boolean;
  activeOn?: number[];
}) {
  let allEventTypeIds = activeOnToRemove;

  if (isOrg) {
    allEventTypeIds = await getAllUserAndTeamEventTypes(activeOnToRemove, activeOn);
  }
  for (const eventTypeId of allEventTypeIds) {
    await removeAIAgentCallPhoneNumberFieldForEventType({
      workflowId,
      eventTypeId,
    });
  }
}

export async function removeAIAgentCallPhoneNumberFieldForEventType({
  workflowId,
  eventTypeId,
}: {
  workflowId: number;
  eventTypeId: number;
}) {
  await removeBookingField(
    {
      name: CAL_AI_AGENT_PHONE_NUMBER_FIELD,
    },
    {
      id: `${workflowId}`,
      type: "workflow",
    },
    eventTypeId
  );
}

async function getAllUserAndTeamEventTypes(teamIds: number[], notMemberOfTeamId: number[] = []) {
  const teamMembersWithEventTypes = await prisma.membership.findMany({
    where: {
      teamId: {
        in: teamIds,
      },
      user: {
        teams: {
          none: {
            team: {
              id: {
                in: notMemberOfTeamId ?? [],
              },
            },
          },
        },
      },
    },
    select: {
      user: {
        select: {
          eventTypes: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  const teamEventTypes = await prisma.eventType.findMany({
    where: {
      teamId: {
        in: teamIds,
      },
    },
  });
  const userEventTypes = teamMembersWithEventTypes?.flatMap((membership) =>
    membership.user.eventTypes.map((et) => et.id)
  );

  return teamEventTypes.map((et) => et.id).concat(userEventTypes);
}

export async function isAuthorizedToAddActiveOnIds({
  newEventTypeIds,
  newRoutingFormIds,
  newTeamIds,
  teamId,
  userId,
}: {
  newEventTypeIds: number[];
  newRoutingFormIds: string[];
  newTeamIds: number[];
  teamId?: number | null;
  userId?: number | null;
}) {
  for (const id of newTeamIds) {
    const newTeam = await prisma.team.findUnique({
      where: {
        id,
      },
      select: {
        parent: true,
      },
    });
    if (newTeam?.parent?.id !== teamId) {
      return false;
    }
  }

  // Check authorization for event type IDs
  for (const id of newEventTypeIds) {
    const newEventType = await prisma.eventType.findUnique({
      where: {
        id,
      },
      include: {
        users: {
          select: {
            id: true,
          },
        },
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

  // Check authorization for routing form IDs
  for (const id of newRoutingFormIds) {
    // For routing forms, check if user has access to the form
    const routingForm = await prisma.app_RoutingForms_Form.findUnique({
      where: {
        id: String(id),
      },
      select: {
        userId: true,
        teamId: true,
      },
    });

    if (!routingForm) return false;

    if (teamId && teamId !== routingForm.teamId) {
      return false;
    }

    if (!teamId && userId && routingForm.userId !== userId) {
      return false;
    }
  }
  return true;
}

export async function deleteRemindersOfActiveOnIds({
  removedActiveOnIds,
  workflowSteps,
  isOrg,
  activeOnIds,
}: {
  removedActiveOnIds: number[];
  workflowSteps: WorkflowStep[];
  isOrg: boolean;
  activeOnIds?: number[];
}) {
  const remindersToDelete = !isOrg
    ? await getRemindersFromRemovedEventTypes(removedActiveOnIds, workflowSteps)
    : await WorkflowRepository.getRemindersFromRemovedTeams(removedActiveOnIds, workflowSteps, activeOnIds);
  await WorkflowRepository.deleteAllWorkflowReminders(remindersToDelete);
}

async function getRemindersFromRemovedEventTypes(removedEventTypes: number[], workflowSteps: WorkflowStep[]) {
  const remindersToDeletePromise: Prisma.PrismaPromise<
    {
      id: number;
      referenceId: string | null;
      method: string;
    }[]
  >[] = [];
  removedEventTypes.forEach((eventTypeId) => {
    const remindersToDelete = prisma.workflowReminder.findMany({
      where: {
        booking: {
          eventTypeId,
        },
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

    remindersToDeletePromise.push(remindersToDelete);
  });

  const remindersToDelete = (await Promise.all(remindersToDeletePromise)).flat();
  return remindersToDelete;
}

export function isStepEdited(oldStep: WorkflowStep, newStep: WorkflowStep) {
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

export const getEventTypeWorkflows = async (
  userId: number,
  eventTypeId: number
): Promise<z.infer<typeof ZWorkflows>> => {
  const workflows = await prisma.workflow.findMany({
    where: {
      OR: [
        {
          userId: userId,
        },
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
      activeOn: {
        some: {
          eventTypeId: eventTypeId,
        },
      },
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

  return workflows.map((workflow) => ({ workflow }));
};

export async function getEmailTemplateText(
  template: WorkflowTemplates,
  params: { locale: string; action: WorkflowActions; timeFormat: number | null }
) {
  const { locale, action } = params;

  const timeFormat = getTimeFormatStringFromUserTimeFormat(params.timeFormat);

  let { emailBody, emailSubject } = emailReminderTemplate({
    isEditingMode: true,
    locale,
    t: await getTranslation(locale ?? "en", "common"),
    action,
    timeFormat,
  });

  if (template === WorkflowTemplates.RATING) {
    const ratingTemplate = emailRatingTemplate({
      isEditingMode: true,
      locale,
      action,
      t: await getTranslation(locale ?? "en", "common"),
      timeFormat,
    });

    emailBody = ratingTemplate.emailBody;
    emailSubject = ratingTemplate.emailSubject;
  }

  return { emailBody, emailSubject };
}
