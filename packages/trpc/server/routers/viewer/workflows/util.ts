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
import { removeBookingField, upsertBookingField } from "@calcom/features/eventtypes/lib/bookingFieldsManager";
import { SMS_REMINDER_NUMBER_FIELD, CAL_AI_AGENT_PHONE_NUMBER_FIELD } from "@calcom/lib/bookings/SystemField";
import { SENDER_ID, SENDER_NAME } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import prisma from "@calcom/prisma";
import type { WorkflowStep } from "@calcom/prisma/client";
import { WorkflowTemplates } from "@calcom/prisma/enums";
import { WorkflowActions } from "@calcom/prisma/enums";

import type { ZWorkflows } from "./getAllActiveWorkflows.schema";

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
