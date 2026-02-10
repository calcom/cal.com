import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";
import type { WorkflowTemplates } from "@calcom/prisma/enums";
import { WorkflowActions, WorkflowMethods, WorkflowStatus } from "@calcom/prisma/enums";

// import * as twilio from "../../providers/twilio";
import * as smsService from "../..//providers/messaging/dispatcher";
import { WORKFLOW_TEMPLATE_TO_DEFAULT_MESSAGE } from "../../managers/smsManager";
import type { SendSmsResponse } from "../../providers/messaging/config/type";
import { getSenderId } from "../../utils/getSenderId";
import wordTruncate from "../../utils/getTruncatedString";
import type { PartialCalIdWorkflowReminder } from "../../utils/getWorkflows";
import { select } from "../../utils/getWorkflows";

const fetchPendingNotifications = async () => {
  return prisma.calIdWorkflowReminder.findMany({
    where: {
      method: WorkflowMethods.SMS,
      scheduled: false,
      scheduledDate: {
        //we only schedule coming 2 hours sms,so that the number of cancellation calls made to smsprovider reduce
        lte: dayjs().add(2, "hour").toISOString(),
        gte: dayjs().toISOString(),
      },
      OR: [{ cancelled: null }, { cancelled: false }],
    },
    select: {
      ...select,
      retryCount: true,
    },
  });
};

const processNotificationQueue = async (): Promise<number> => {
  const pendingNotifications = (await fetchPendingNotifications()) as (PartialCalIdWorkflowReminder & {
    retryCount: number;
  })[];

  for (const notification of pendingNotifications) {
    if (!notification.workflowStep || !notification.booking) {
      continue;
    }
    const workflowUserId = notification.workflowStep.workflow.userId;
    const workflowTeamId = notification.workflowStep.workflow.calIdTeamId;

    try {
      const recipientNumber =
        notification.workflowStep.action === WorkflowActions.SMS_NUMBER
          ? notification.workflowStep.sendTo
          : notification.booking?.smsReminderNumber;

      const recipientDisplayName =
        notification.workflowStep.action === WorkflowActions.SMS_ATTENDEE
          ? notification.booking?.attendees[0].name
          : "";

      const participantDisplayName =
        notification.workflowStep.action === WorkflowActions.SMS_ATTENDEE
          ? notification.booking?.user?.name
          : notification.booking?.attendees[0].name;

      const participantTimeZone =
        notification.workflowStep.action === WorkflowActions.SMS_ATTENDEE
          ? notification.booking?.attendees[0].timeZone
          : notification.booking?.user?.timeZone;

      const messageSenderId = getSenderId(recipientNumber, notification.workflowStep.sender);

      const participantLocale =
        notification.workflowStep.action === WorkflowActions.EMAIL_ATTENDEE ||
        notification.workflowStep.action === WorkflowActions.SMS_ATTENDEE
          ? notification.booking?.attendees[0].locale
          : notification.booking?.user?.locale;

      // Initialize messageText with empty string instead of null
      let messageText = "";

      // Use the new default template system from smsManager for other workflow templates
      const targetAttendee = notification.booking.attendees[0];

      const defaultTemplate =
        WORKFLOW_TEMPLATE_TO_DEFAULT_MESSAGE[notification.workflowStep.template as WorkflowTemplates];

      if (defaultTemplate) {
        const recipientName =
          notification.workflowStep.action === WorkflowActions.SMS_ATTENDEE
            ? targetAttendee.name
            : notification.booking.user?.name || "";

        const senderName =
          notification.workflowStep.action === WorkflowActions.SMS_ATTENDEE
            ? notification.booking.user?.name || ""
            : targetAttendee.name;

        //To prevent template variable length constraints, we are truncating event title to 40 characters and removing any double quotes to avoid breaking the message format. This is done to ensure that the most important information is conveyed within the SMS character limits.
        const eventTitle = wordTruncate(
          (notification.booking.eventType?.title ?? "").trim().replace(/"/g, "")
        );

        const eventMoment = dayjs(notification.booking.startTime)
          .tz(participantTimeZone || "UTC")
          .locale(participantLocale || "en");
        const formattedDate = eventMoment.format("DD MMM YYYY");
        const formattedTimeWithLocalizedTimeZone = eventMoment.format("h:mma [GMT]Z");
        const [formattedTime, localizedRecipientTimezone] = formattedTimeWithLocalizedTimeZone.split(" ");

        messageText = defaultTemplate
          .replace(/\{\{1\}\}/g, recipientName.split(" ")[0])
          .replace(/\{\{2\}\}/g, eventTitle)
          .replace(/\{\{3\}\}/g, senderName.split(" ")[0])
          .replace(/\{\{4\}\}/g, formattedDate)
          .replace(/\{\{5\}\}/g, formattedTime)
          .replace(/\{\{6\}\}/g, localizedRecipientTimezone);
      }

      // Only proceed if we have a valid message and recipient number
      if (messageText.length > 0 && recipientNumber) {
        const dispatchedSMS = await smsService.scheduleSMS(
          recipientNumber,
          messageText,
          notification.scheduledDate,
          messageSenderId,
          workflowUserId,
          workflowTeamId,
          false,
          undefined,
          undefined
        );
        //If sms was successfully scheduled by provider and the unique identifier "sid" was returned
        if (dispatchedSMS && dispatchedSMS.response?.sid) {
          //  Update reminder
          await updateWorkflowReminder(notification, dispatchedSMS);
          // Create workflow insight
          await createWorkflowInsight(dispatchedSMS, notification, recipientNumber, messageText);
        } else {
          await prisma.calIdWorkflowReminder.update({
            where: {
              id: notification.id,
            },
            data: {
              retryCount: notification.retryCount + 1,
            },
          });
        }
      }
    } catch (error) {
      await prisma.calIdWorkflowReminder.update({
        where: {
          id: notification.id,
        },
        data: {
          retryCount: notification.retryCount + 1,
        },
      });
      console.log(`SMS scheduling failed with error ${error}`);
    }
  }
  return pendingNotifications.length;
};

// const removeExpiredNotifications = async (): Promise<void> => {
//   await prisma.calIdWorkflowReminder.deleteMany({
//     where: {
//       OR: [
//         {
//           method: WorkflowMethods.SMS,
//           scheduledDate: {
//             lte: dayjs().toISOString(),
//           },
//           scheduled: false,
//           OR: [{ cancelled: null }, { cancelled: false }],
//         },
//         {
//           retryCount: {
//             gt: 1,
//           },
//         },
//       ],
//     },
//   });
// };

const executeCancellationProcess = async (): Promise<void> => {
  const messagesToCancel = await prisma.calIdWorkflowReminder.findMany({
    where: {
      method: WorkflowMethods.SMS,
      scheduled: true,
      cancelled: true,
      scheduledDate: {
        lte: dayjs().add(1, "hour").toISOString(),
        gte: dayjs().toISOString(),
      },
    },
  });

  const cancellationTasks: Promise<any>[] = [];
  for (const messageToCancel of messagesToCancel) {
    if (messageToCancel.referenceId) {
      const smsProviderRequest = smsService.cancelSMS(messageToCancel.referenceId);

      const dbTransaction = prisma
        .$transaction(async (tx) => {
          if (messageToCancel.referenceId)
            await tx.calIdWorkflowInsights.updateMany({
              where: {
                msgId: messageToCancel.referenceId,
                type: WorkflowMethods.SMS,
                status: WorkflowStatus.QUEUED,
              },
              data: {
                status: WorkflowStatus.CANCELLED,
              },
            });

          await tx.calIdWorkflowReminder.update({
            where: {
              id: messageToCancel.id,
            },
            data: {
              referenceId: null,
              scheduled: false,
            },
          });
        })
        .then(() => {
          console.log(
            `Cancelled SMS and updated workflow records for reference ID: ${messageToCancel.referenceId}`
          );
        });

      cancellationTasks.push(smsProviderRequest, dbTransaction);
    }
  }

  await Promise.all(cancellationTasks);
};

async function updateWorkflowReminder(notification, dispatchedSMS: SendSmsResponse) {
  await prisma.calIdWorkflowReminder.update({
    where: {
      id: notification.id,
    },
    data: {
      scheduled: true,
      referenceId: dispatchedSMS.response.sid,
    },
  });
}

async function createWorkflowInsight(
  dispatchedSMS: SendSmsResponse,
  notification: any,
  recipientNumber: string,
  messageText: string
) {
  await prisma.calIdWorkflowInsights.create({
    data: {
      msgId: dispatchedSMS.response.sid,
      type: WorkflowMethods.SMS,
      status: WorkflowStatus.QUEUED,

      eventType: {
        connect: { id: notification.booking.eventTypeId },
      },

      booking: {
        connect: { uid: notification.booking.uid },
      },

      ...(notification.seatReferenceId && {
        bookingSeat: {
          connect: { referenceUid: notification.seatReferenceId },
        },
      }),

      ...(notification.workflowStep?.id && {
        workflowStep: {
          connect: { id: notification.workflowStep.id },
        },
      }),

      ...(notification.workflowStep?.workflowId && {
        workflow: {
          connect: { id: notification.workflowStep.workflowId },
        },
      }),

      metadata: {
        recipientNumber,
        smsText: messageText,
        sendAt: notification.scheduledDate,
        isScheduled: true,
      },
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const authorizationHeader = request.headers.get("authorization");

    if (!process.env.CRON_API_KEY || authorizationHeader !== `${process.env.CRON_API_KEY}`) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    //preventing removal of expired notifications
    // await removeExpiredNotifications();
    await executeCancellationProcess();

    const scheduledMessagesCount = await processNotificationQueue();

    return NextResponse.json(
      {
        message: `${scheduledMessagesCount} SMS scheduled`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in SMS queue processing:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}
