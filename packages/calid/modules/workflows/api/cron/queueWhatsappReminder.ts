import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";
import { WorkflowActions, WorkflowMethods } from "@calcom/prisma/enums";

import * as twilio from "../../providers/twilio";
import type { PartialCalIdWorkflowReminder } from "../../utils/getWorkflows";
import { select } from "../../utils/getWorkflows";

// const removeExpiredNotifications = async (): Promise<void> => {
//   await prisma.calIdWorkflowReminder.deleteMany({
//     where: {
//       method: WorkflowMethods.WHATSAPP,
//       scheduledDate: {
//         lte: dayjs().toISOString(),
//       },
//       scheduled: false,
//       OR: [{ cancelled: null }, { cancelled: false }],
//     },
//   });
// };

const fetchPendingMessages = async () => {
  return prisma.calIdWorkflowReminder.findMany({
    where: {
      method: WorkflowMethods.WHATSAPP,
      scheduled: false,
      scheduledDate: {
        lte: dayjs().add(7, "day").toISOString(),
        gte: dayjs().toISOString(),
      },
      OR: [{ cancelled: null }, { cancelled: false }],
    },
    select,
  });
};

const processMessageQueue = async (): Promise<number> => {
  const pendingMessages = (await fetchPendingMessages()) as PartialCalIdWorkflowReminder[];

  for (const message of pendingMessages) {
    if (!message.workflowStep || !message.booking) {
      continue;
    }
    const workflowUserId = message.workflowStep.workflow.userId;
    const workflowTeamId = message.workflowStep.workflow.calIdTeamId;

    try {
      const recipientNumber =
        message.workflowStep.action === WorkflowActions.WHATSAPP_NUMBER
          ? message.workflowStep.sendTo
          : message.booking?.smsReminderNumber;

      const organizerName = message.booking?.user?.name;

      const participantName = message.booking?.attendees[0].name;

      const participantTimeZone =
        message.workflowStep.action === WorkflowActions.WHATSAPP_ATTENDEE
          ? message.booking?.attendees[0].timeZone
          : message.booking?.user?.timeZone;

      const { workflowStep, booking } = message;
      const templateVariables = twilio.generateContentVars(
        {
          workflowStep: {
            action: workflowStep.action,
            template: workflowStep.template,
          },
          booking: {
            eventType: {
              title: booking.eventType?.title ?? "N/A",
            },
            startTime: booking.startTime,
            user: {
              locale: booking.user?.locale,
              timeFormat: booking.user?.timeFormat,
            },
          },
        },
        participantName || "",
        organizerName || "",
        participantTimeZone || ""
      );

      if (recipientNumber) {
        const dispatchedMessage = await twilio.scheduleSMS(
          recipientNumber,
          "",
          message.scheduledDate,
          "",
          workflowUserId,
          workflowTeamId,
          true,
          message.workflowStep.template,
          JSON.stringify(templateVariables),
          message.booking?.eventTypeId ? { eventTypeId: message.booking?.eventTypeId } : undefined
        );

        if (dispatchedMessage) {
          await prisma.calIdWorkflowReminder.update({
            where: {
              id: message.id,
            },
            data: {
              scheduled: true,
              referenceId: dispatchedMessage.sid,
            },
          });
        }
      }
    } catch (error) {
      console.log(`WHATSAPP scheduling failed with error ${error}`);
    }
  }

  return pendingMessages.length;
};

const executeCancellationProcess = async (): Promise<void> => {
  const messagesToCancel = await prisma.calIdWorkflowReminder.findMany({
    where: {
      method: WorkflowMethods.WHATSAPP,
      scheduled: true,
      cancelled: true,
      scheduledDate: {
        lte: dayjs().add(1, "hour").toISOString(),
        gte: dayjs().toISOString(),
      },
    },
  });

  const cancellationTasks: Promise<void>[] = [];
  for (const messageToCancel of messagesToCancel) {
    if (messageToCancel.referenceId) {
      const twilioRequest = twilio.cancelSMS(messageToCancel.referenceId);

      const databaseUpdate = prisma.calIdWorkflowReminder
        .update({
          where: {
            id: messageToCancel.id,
          },
          data: {
            referenceId: null,
            scheduled: false,
          },
        })
        .then(() => {
          console.log(`Cancelled WHATSAPP message with ID: ${messageToCancel.id}`);
        });

      cancellationTasks.push(twilioRequest, databaseUpdate);
    }
  }

  await Promise.all(cancellationTasks);
};

export async function POST(request: NextRequest) {
  try {
    const authorizationHeader = request.headers.get("authorization");

    if (!process.env.CRON_SECRET || authorizationHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    // await removeExpiredNotifications();
    await executeCancellationProcess();

    const scheduledMessagesCount = await processMessageQueue();

    return NextResponse.json(
      {
        message: `${scheduledMessagesCount} WHATSAPP scheduled`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in WHATSAPP queue processing:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}
