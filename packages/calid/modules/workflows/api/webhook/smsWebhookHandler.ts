import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import prisma from "@calcom/prisma";
import { WorkflowContactType, WorkflowMethods, WorkflowActions } from "@calcom/prisma/enums";

import { deleteMultipleScheduledSMS } from "../../providers/twilio";
import { determineOptOutType } from "../../providers/twilio";

async function optOutPhoneNumber(phoneNumber: string) {
  await prisma.workflowOptOutContact.upsert({
    where: {
      type_value: {
        type: WorkflowContactType.PHONE,
        value: phoneNumber,
      },
    },
    update: {
      optedOut: true,
    },
    create: {
      type: WorkflowContactType.PHONE,
      optedOut: true,
      value: phoneNumber,
    },
  });
  // Delete scheduled workflows
  const scheduledReminders = await prisma.calIdWorkflowReminder.findMany({
    where: {
      method: WorkflowMethods.SMS,
      cancelled: null,
      scheduledDate: { gte: new Date() },
      booking: {
        smsReminderNumber: phoneNumber,
      },
      workflowStep: {
        action: WorkflowActions.SMS_ATTENDEE,
      },
    },
  });

  // Get twilio scheduled workflows reminders
  await deleteMultipleScheduledSMS(
    scheduledReminders
      .filter((reminder) => !!reminder.referenceId)
      .map((reminder) => reminder.referenceId as string)
  );

  const deleteWorkflowReminders = (ids: number[]) => {
    if (!ids.length) {
      return [];
    }

    return prisma.calIdWorkflowReminder.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  };

  // Preserving workflow reminders for analytics

  // Get not twilio scheduled yet workflows
  // await deleteWorkflowReminders(
  //   scheduledReminders.filter((reminder) => !reminder.referenceId).map((reminder) => reminder.id)
  // );
}

const SMSWebhookHandler = async (incomingRequest: NextRequest) => {
  try {
    const exclusionAnalysisResult = await determineOptOutType(incomingRequest);
    if ("error" in exclusionAnalysisResult) {
      return NextResponse.json({ message: exclusionAnalysisResult.error }, { status: 400 });
    }

    const shouldExcludeContact = exclusionAnalysisResult.optOutStatus;
    const contactNumber = exclusionAnalysisResult.phoneNumber;

    if (shouldExcludeContact) {
      await optOutPhoneNumber(contactNumber);
    } else {
      await prisma.workflowOptOutContact.update({
        where: {
          type_value: {
            type: WorkflowContactType.PHONE,
            value: contactNumber,
          },
        },
        data: {
          optedOut: false,
        },
      });
    }

    const successResponse = NextResponse.json(
      { message: "Opt status updated successfully" },
      { status: 200 }
    );
    return successResponse;
  } catch (processingError) {
    console.error("Error processing user response webhook:", processingError);
    const errorResponse = NextResponse.json({ message: "Internal server error" }, { status: 500 });
    return errorResponse;
  }
};

export default SMSWebhookHandler;
