import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { CAL_AI_AGENT_PHONE_NUMBER_FIELD } from "@calcom/features/bookings/lib/SystemField";
import tasker from "@calcom/features/tasker";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { WorkflowMethods, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import type { TimeUnit } from "@calcom/prisma/enums";

import type { ExtendedCalendarEvent } from "./reminderScheduler";

type timeUnitLowerCase = "day" | "hour" | "minute";

// Zod schema for phone number fields in booking responses
const phoneNumberFieldsSchema = z.object({
  [CAL_AI_AGENT_PHONE_NUMBER_FIELD]: z.string().optional(),
  attendeePhoneNumber: z.string().optional(),
});

interface ScheduleAIPhoneCallArgs {
  evt: ExtendedCalendarEvent;
  triggerEvent: WorkflowTriggerEvents;
  timeSpan: {
    time: number | null;
    timeUnit: TimeUnit | null;
  };
  workflowStepId: number;
  userId: number | null;
  teamId: number | null;
  seatReferenceUid?: string;
  verifiedAt: Date | null;
}

export const scheduleAIPhoneCall = async (args: ScheduleAIPhoneCallArgs) => {
  const { evt, triggerEvent, timeSpan, workflowStepId, userId, teamId, seatReferenceUid, verifiedAt } = args;

  if (!verifiedAt) {
    logger.warn(`Workflow step ${workflowStepId} not yet verified`);
    return;
  }

  // Get the workflow step to check if it has an agent configured
  const workflowStep = await prisma.workflowStep.findUnique({
    where: { id: workflowStepId },
    include: {
      agent: {
        include: {
          outboundPhoneNumbers: {
            select: {
              phoneNumber: true,
            },
          },
        },
      },
    },
  });

  if (!workflowStep?.agent) {
    logger.warn(`No agent configured for workflow step ${workflowStepId}`);
    return;
  }

  if (!workflowStep.agent.outboundPhoneNumbers?.length) {
    logger.warn(`No outbound phone number configured for agent ${workflowStep.agent.id}`);
    return;
  }

  console.log("workflowStep", JSON.stringify(workflowStep, null, 2));

  const { startTime, endTime } = evt;
  const uid = evt.uid as string;
  const currentDate = dayjs();
  const timeUnit: timeUnitLowerCase | undefined = timeSpan.timeUnit?.toLocaleLowerCase() as timeUnitLowerCase;
  let scheduledDate = null;

  // Calculate when the AI phone call should be made
  if (triggerEvent === WorkflowTriggerEvents.BEFORE_EVENT) {
    scheduledDate = timeSpan.time && timeUnit ? dayjs(startTime).subtract(timeSpan.time, timeUnit) : null;
  } else if (triggerEvent === WorkflowTriggerEvents.AFTER_EVENT) {
    scheduledDate = timeSpan.time && timeUnit ? dayjs(endTime).add(timeSpan.time, timeUnit) : null;
  }

  // For immediate triggers (like NEW_EVENT, EVENT_CANCELLED, etc.), schedule immediately
  if (!scheduledDate) {
    scheduledDate = currentDate;
  }

  console.log("scheduledDate", scheduledDate);

  // Determine if we should execute immediately or schedule for later
  const shouldExecuteImmediately =
    // Immediate triggers (NEW_EVENT, EVENT_CANCELLED, etc.)
    !timeSpan.time ||
    !timeSpan.timeUnit ||
    // Or if the scheduled time has already passed
    (scheduledDate && currentDate.isAfter(scheduledDate));

  console.log("shouldExecuteImmediately", shouldExecuteImmediately, {
    timeSpan,
    triggerEvent,
    scheduledDate: scheduledDate?.toISOString(),
    currentDate: currentDate.toISOString(),
  });

  if (!shouldExecuteImmediately) {
    // Schedule for future execution
    try {
      // Create a workflow reminder record
      const workflowReminder = await prisma.workflowReminder.create({
        data: {
          bookingUid: uid,
          workflowStepId: workflowStepId,
          method: WorkflowMethods.AI_PHONE_CALL,
          scheduledDate: scheduledDate.toDate(),
          scheduled: true,
          seatReferenceId: seatReferenceUid,
        },
      });

      // Get the phone number from booking responses using proper Zod schema
      const phoneNumberFields = evt.responses
        ? phoneNumberFieldsSchema.safeParse(evt.responses)
        : { success: false, data: {} };
      let attendeePhoneNumber: string | undefined;

      // Handle nested response structure where phone numbers are stored as objects
      if (evt.responses) {
        // Check for attendeePhoneNumber in the nested structure
        const attendeePhoneResponse = evt.responses.attendeePhoneNumber;
        if (
          attendeePhoneResponse &&
          typeof attendeePhoneResponse === "object" &&
          "value" in attendeePhoneResponse
        ) {
          attendeePhoneNumber = attendeePhoneResponse.value as string;
        }

        // Check for aiAgentCallPhoneNumber in the nested structure
        const aiAgentPhoneResponse = evt.responses[CAL_AI_AGENT_PHONE_NUMBER_FIELD];
        if (
          !attendeePhoneNumber &&
          aiAgentPhoneResponse &&
          typeof aiAgentPhoneResponse === "object" &&
          "value" in aiAgentPhoneResponse
        ) {
          attendeePhoneNumber = aiAgentPhoneResponse.value as string;
        }
      }

      // Fallback to the original Zod schema parsing
      if (!attendeePhoneNumber && phoneNumberFields.success && phoneNumberFields.data) {
        const data = phoneNumberFields.data as z.infer<typeof phoneNumberFieldsSchema>;
        attendeePhoneNumber = data.attendeePhoneNumber || (data as any)[CAL_AI_AGENT_PHONE_NUMBER_FIELD];
      }

      console.log("Phone number extraction:", {
        responses: evt.responses,
        phoneNumberFields,
        attendeePhoneNumber,
        CAL_AI_AGENT_PHONE_NUMBER_FIELD,
        responsesKeys: evt.responses ? Object.keys(evt.responses) : [],
      });

      if (!attendeePhoneNumber) {
        // Try to get phone number from attendees if not found in responses
        const attendeePhone = evt.attendees?.[0]?.phoneNumber;
        if (attendeePhone) {
          attendeePhoneNumber = attendeePhone;
          console.log("Using phone number from attendee:", attendeePhoneNumber);
        } else {
          logger.warn(`No attendee phone number found for workflow step ${workflowStepId}`);
          return;
        }
      }

      // Schedule the actual AI phone call
      await scheduleAIPhoneCallTask({
        workflowReminderId: workflowReminder.id,
        scheduledDate: scheduledDate.toDate(),
        agentId: workflowStep.agent.id,
        phoneNumber: workflowStep.agent.outboundPhoneNumbers[0].phoneNumber,
        attendeePhoneNumber,
        bookingUid: uid,
        userId,
        teamId,
      });

      logger.info(`AI phone call scheduled for workflow step ${workflowStepId} at ${scheduledDate}`);
    } catch (error) {
      logger.error(`Error scheduling AI phone call with error ${error}`);
    }
  } else {
    // Execute immediately
    console.log("Executing AI phone call immediately");
    try {
      // Create a workflow reminder record
      const workflowReminder = await prisma.workflowReminder.create({
        data: {
          bookingUid: uid,
          workflowStepId: workflowStepId,
          method: WorkflowMethods.AI_PHONE_CALL,
          scheduledDate: currentDate.toDate(),
          scheduled: true,
          seatReferenceId: seatReferenceUid,
        },
      });

      // Get the phone number from booking responses using proper Zod schema
      const phoneNumberFields = evt.responses
        ? phoneNumberFieldsSchema.safeParse(evt.responses)
        : { success: false, data: {} };
      let attendeePhoneNumber: string | undefined;

      // Handle nested response structure where phone numbers are stored as objects
      if (evt.responses) {
        // Check for attendeePhoneNumber in the nested structure
        const attendeePhoneResponse = evt.responses.attendeePhoneNumber;
        if (
          attendeePhoneResponse &&
          typeof attendeePhoneResponse === "object" &&
          "value" in attendeePhoneResponse
        ) {
          attendeePhoneNumber = attendeePhoneResponse.value as string;
        }

        // Check for aiAgentCallPhoneNumber in the nested structure
        const aiAgentPhoneResponse = evt.responses[CAL_AI_AGENT_PHONE_NUMBER_FIELD];
        if (
          !attendeePhoneNumber &&
          aiAgentPhoneResponse &&
          typeof aiAgentPhoneResponse === "object" &&
          "value" in aiAgentPhoneResponse
        ) {
          attendeePhoneNumber = aiAgentPhoneResponse.value as string;
        }
      }

      // Fallback to the original Zod schema parsing
      if (!attendeePhoneNumber && phoneNumberFields.success && phoneNumberFields.data) {
        const data = phoneNumberFields.data as z.infer<typeof phoneNumberFieldsSchema>;
        attendeePhoneNumber = data.attendeePhoneNumber || (data as any)[CAL_AI_AGENT_PHONE_NUMBER_FIELD];
      }

      console.log("Phone number extraction (immediate):", {
        responses: evt.responses,
        phoneNumberFields,
        attendeePhoneNumber,
        CAL_AI_AGENT_PHONE_NUMBER_FIELD,
        responsesKeys: evt.responses ? Object.keys(evt.responses) : [],
      });

      if (!attendeePhoneNumber) {
        // Try to get phone number from attendees if not found in responses
        const attendeePhone = evt.attendees?.[0]?.phoneNumber;
        if (attendeePhone) {
          attendeePhoneNumber = attendeePhone;
          console.log("Using phone number from attendee (immediate):", attendeePhoneNumber);
        } else {
          logger.warn(`No attendee phone number found for workflow step ${workflowStepId}`);
          return;
        }
      }

      // Schedule the actual AI phone call immediately
      await scheduleAIPhoneCallTask({
        workflowReminderId: workflowReminder.id,
        scheduledDate: currentDate.toDate(),
        agentId: workflowStep.agent.id,
        phoneNumber: workflowStep.agent.outboundPhoneNumbers[0].phoneNumber,
        attendeePhoneNumber,
        bookingUid: uid,
        userId,
        teamId,
      });

      logger.info(`AI phone call scheduled for immediate execution for workflow step ${workflowStepId}`);
    } catch (error) {
      logger.error(`Error scheduling immediate AI phone call with error ${error}`);
    }
  }
};

interface ScheduleAIPhoneCallTaskArgs {
  workflowReminderId: number;
  scheduledDate: Date;
  agentId: string;
  phoneNumber: string;
  attendeePhoneNumber: string;
  bookingUid: string;
  userId: number | null;
  teamId: number | null;
}

const scheduleAIPhoneCallTask = async (args: ScheduleAIPhoneCallTaskArgs) => {
  const {
    workflowReminderId,
    scheduledDate,
    agentId,
    phoneNumber,
    attendeePhoneNumber,
    bookingUid,
    userId,
    teamId,
  } = args;

  console.log("Scheduling AI phone call task:", {
    workflowReminderId,
    scheduledDate,
    agentId,
    phoneNumber,
    attendeePhoneNumber,
    bookingUid,
    userId,
    teamId,
  });

  if (userId) {
    await checkRateLimitAndThrowError({
      rateLimitingType: "core",
      identifier: `ai-phone-call:${userId}`,
    });
  }

  const currentTime = dayjs();
  const scheduledTime = dayjs(scheduledDate);

  try {
    if (scheduledTime.diff(currentTime, "minute") <= 5) {
      console.log("Creating immediate AI phone call task");
      const taskId = await tasker.create("executeAIPhoneCall", {
        workflowReminderId,
        agentId,
        fromNumber: phoneNumber,
        toNumber: attendeePhoneNumber,
        bookingUid,
        userId,
        teamId,
      });
      console.log("Immediate AI phone call task created with ID:", taskId);
    } else {
      console.log("Creating scheduled AI phone call task");
      const taskId = await tasker.create(
        "executeAIPhoneCall",
        {
          workflowReminderId,
          agentId,
          fromNumber: phoneNumber,
          toNumber: attendeePhoneNumber,
          bookingUid,
          userId,
          teamId,
        },
        {
          scheduledAt: scheduledDate,
          maxAttempts: 1,
        }
      );
      console.log("Scheduled AI phone call task created with ID:", taskId);
    }
    console.log("AI phone call task created successfully");
  } catch (error) {
    console.error("Error creating AI phone call task:", error);
    throw error;
  }
};
