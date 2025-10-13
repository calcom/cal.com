import { v4 as uuidv4 } from "uuid";

import dayjs from "@calcom/dayjs";
import { CAL_AI_AGENT_PHONE_NUMBER_FIELD } from "@calcom/lib/SystemField";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import tasker from "@calcom/features/tasker";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { WorkflowMethods, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import type { TimeUnit } from "@calcom/prisma/enums";
import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

import type { BookingInfo } from "./smsReminderManager";

type timeUnitLowerCase = "day" | "hour" | "minute";

function extractPhoneNumber(responses: BookingInfo["responses"]): string | undefined {
  if (!responses) return undefined;

  // Priority 1: CAL_AI_AGENT_PHONE_NUMBER_FIELD first
  const aiAgentPhoneResponse = responses[CAL_AI_AGENT_PHONE_NUMBER_FIELD];
  if (aiAgentPhoneResponse && typeof aiAgentPhoneResponse === "object" && "value" in aiAgentPhoneResponse) {
    return aiAgentPhoneResponse.value as string;
  }

  // Priority 2: attendeePhoneNumber as fallback
  const attendeePhoneResponse = responses.attendeePhoneNumber;
  if (
    attendeePhoneResponse &&
    typeof attendeePhoneResponse === "object" &&
    "value" in attendeePhoneResponse
  ) {
    return attendeePhoneResponse.value as string;
  }

  return undefined;
}

interface CreateWorkflowReminderAndExtractPhoneArgs {
  evt: BookingInfo;
  workflowStepId: number;
  scheduledDate: dayjs.Dayjs;
  seatReferenceUid?: string;
}

interface CreateWorkflowReminderAndExtractPhoneResult {
  workflowReminder: { id: number; uuid: string | null };
  attendeePhoneNumber: string;
}

const createWorkflowReminderAndExtractPhone = async (
  args: CreateWorkflowReminderAndExtractPhoneArgs
): Promise<CreateWorkflowReminderAndExtractPhoneResult> => {
  const { evt, workflowStepId, scheduledDate, seatReferenceUid } = args;

  // 1) Determine attendee phone first (fail early)
  let attendeePhoneNumber = extractPhoneNumber(evt.responses);
  if (!attendeePhoneNumber) {
    const attendeePhone = evt.attendees?.[0]?.phoneNumber;
    if (attendeePhone) {
      attendeePhoneNumber = attendeePhone;
    } else {
      throw new Error(`No attendee phone number found for workflow step ${workflowStepId}`);
    }
  }

  const workflowReminder = await prisma.workflowReminder.create({
    data: {
      bookingUid: evt.uid as string,
      workflowStepId,
      method: WorkflowMethods.AI_PHONE_CALL,
      scheduledDate: scheduledDate.toDate(),
      scheduled: true,
      seatReferenceId: seatReferenceUid,
    },
  });

  return { workflowReminder, attendeePhoneNumber };
};

interface ScheduleAIPhoneCallArgs {
  evt: BookingInfo;
  triggerEvent: WorkflowTriggerEvents;
  timeSpan: {
    time: number | null;
    timeUnit: TimeUnit | null;
  };
  workflowStepId: number | undefined;
  userId: number | null;
  teamId: number | null;
  seatReferenceUid?: string;
  verifiedAt: Date | null;
}

export const scheduleAIPhoneCall = async (args: ScheduleAIPhoneCallArgs) => {
  const { evt, triggerEvent, timeSpan, workflowStepId, userId, teamId, seatReferenceUid, verifiedAt } = args;

  if (!verifiedAt || !workflowStepId) {
    logger.warn(`Workflow step ${workflowStepId} not yet verified or not found`);
    return;
  }

  // Get the workflow step to check if it has an agent configured
  const workflowStep = await prisma.workflowStep.findUnique({
    where: { id: workflowStepId },
    select: {
      agent: {
        select: {
          id: true,
          providerAgentId: true,
          outboundPhoneNumbers: {
            select: {
              phoneNumber: true,
              subscriptionStatus: true,
            },
          },
        },
      },
    },
  });

  const activePhoneNumbers = workflowStep?.agent?.outboundPhoneNumbers?.filter(
    (phoneNumber) =>
      phoneNumber.subscriptionStatus === PhoneNumberSubscriptionStatus.ACTIVE ||
      phoneNumber.subscriptionStatus === null ||
      phoneNumber.subscriptionStatus === undefined
  );

  if (!workflowStep?.agent) {
    logger.warn(`No agent configured for workflow step ${workflowStepId}`);
    return;
  }

  if (!workflowStep.agent.outboundPhoneNumbers?.length || !activePhoneNumbers?.length) {
    logger.warn(`No active outbound phone number configured for agent ${workflowStep.agent.id}`);
    return;
  }

  const featuresRepository = new FeaturesRepository(prisma);
  const calAIVoiceAgents = await featuresRepository.checkIfFeatureIsEnabledGlobally("cal-ai-voice-agents");
  if (!calAIVoiceAgents) {
    logger.warn("Cal AI voice agents are disabled - skipping AI phone call scheduling");
    return;
  }

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

  // Determine if we should execute immediately or schedule for later
  const shouldExecuteImmediately =
    // Immediate triggers (NEW_EVENT, EVENT_CANCELLED, etc.)
    !timeSpan.time ||
    !timeSpan.timeUnit ||
    // Or if the scheduled time has already passed
    (scheduledDate && currentDate.isAfter(scheduledDate));

  if (!shouldExecuteImmediately) {
    try {
      const { workflowReminder, attendeePhoneNumber } = await createWorkflowReminderAndExtractPhone({
        evt,
        workflowStepId,
        scheduledDate,
        seatReferenceUid,
      });

      // Schedule the actual AI phone call
      await scheduleAIPhoneCallTask({
        workflowReminderId: workflowReminder.id,
        scheduledDate: scheduledDate.toDate(),
        agentId: workflowStep.agent.id,
        phoneNumber: activePhoneNumbers[0].phoneNumber,
        attendeePhoneNumber,
        bookingUid: uid,
        userId,
        teamId,
        providerAgentId: workflowStep.agent.providerAgentId,
        referenceUid: workflowReminder.uuid || uuidv4(),
      });

      logger.info(`AI phone call scheduled for workflow step ${workflowStepId} at ${scheduledDate}`);
    } catch (error) {
      logger.error(`Error scheduling AI phone call with error ${error}`);
    }
  } else {
    // Execute immediately
    try {
      const { workflowReminder, attendeePhoneNumber } = await createWorkflowReminderAndExtractPhone({
        evt,
        workflowStepId,
        scheduledDate: currentDate,
        seatReferenceUid,
      });

      // Schedule the actual AI phone call immediatel
      // Should i execute the task immediately or schedule it for later?
      await scheduleAIPhoneCallTask({
        workflowReminderId: workflowReminder.id,
        scheduledDate: currentDate.toDate(),
        agentId: workflowStep.agent.id,
        phoneNumber: activePhoneNumbers[0].phoneNumber,
        attendeePhoneNumber,
        bookingUid: uid,
        userId,
        teamId,
        providerAgentId: workflowStep.agent.providerAgentId,
        referenceUid: workflowReminder.uuid || uuidv4(),
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
  providerAgentId: string;
  referenceUid: string;
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
    providerAgentId,
    referenceUid,
  } = args;

  const featuresRepository = new FeaturesRepository(prisma);
  const calAIVoiceAgents = await featuresRepository.checkIfFeatureIsEnabledGlobally("cal-ai-voice-agents");
  if (!calAIVoiceAgents) {
    logger.warn("Cal AI voice agents are disabled - skipping AI phone call");
    return;
  }

  if (userId) {
    await checkRateLimitAndThrowError({
      rateLimitingType: "core",
      identifier: `ai-phone-call:${userId}`,
    });
  }

  try {
    await tasker.create(
      "executeAIPhoneCall",
      {
        workflowReminderId,
        agentId,
        fromNumber: phoneNumber,
        toNumber: attendeePhoneNumber,
        bookingUid,
        userId,
        teamId,
        providerAgentId,
      },
      {
        scheduledAt: scheduledDate,
        maxAttempts: 1,
        referenceUid,
      }
    );
  } catch (error) {
    console.error("Error creating AI phone call task:", error);
    throw error;
  }
};

export const deleteScheduledAIPhoneCall = async (reminderId: number, referenceId: string | null) => {
  const workflowReminder = await prisma.workflowReminder.findUnique({
    where: {
      id: reminderId,
    },
  });

  if (!workflowReminder) {
    logger.error("AI Phone Call workflow reminder not found");
    return;
  }

  const { uuid } = workflowReminder;
  const taskReferenceId = referenceId || uuid;

  if (taskReferenceId) {
    try {
      const taskId = await tasker.cancelWithReference(taskReferenceId, "executeAIPhoneCall");
      if (taskId) {
        await prisma.workflowReminder.delete({
          where: {
            id: reminderId,
          },
        });

        logger.info(`AI phone call reminder ${reminderId} cancelled and deleted`);
        return;
      }
    } catch (error) {
      logger.error(`Error canceling/deleting AI phone call reminder with tasker. Error: ${error}`);
    }
  }

  // Fallback: If tasker cancellation fails or uuid is not found, just delete the reminder
  try {
    await prisma.workflowReminder.delete({
      where: {
        id: reminderId,
      },
    });
    logger.info(`AI phone call reminder ${reminderId} deleted (no task to cancel)`);
  } catch (error) {
    logger.error(`Error deleting AI phone call reminder ${reminderId}: ${error}`);
  }
};
