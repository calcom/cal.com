import type { FORM_SUBMITTED_WEBHOOK_RESPONSES } from "@calcom/app-store/routing-forms/lib/formSubmissionUtils";
import dayjs from "@calcom/dayjs";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import tasker from "@calcom/features/tasker";
import { CAL_AI_AGENT_PHONE_NUMBER_FIELD } from "@calcom/lib/bookings/SystemField";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { TimeUnit } from "@calcom/prisma/enums";
import { PhoneNumberSubscriptionStatus, WorkflowMethods, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { v4 as uuidv4 } from "uuid";
import type { BookingInfo, FormSubmissionData } from "../types";
import type { WorkflowContextData } from "./reminderScheduler";

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

type CreateWorkflowReminderAndExtractPhoneArgs = WorkflowContextData & {
  workflowStepId: number;
  scheduledDate: dayjs.Dayjs;
  seatReferenceUid?: string;
  submittedPhoneNumber?: string | null;
};

interface CreateWorkflowReminderAndExtractPhoneResult {
  workflowReminder: { id: number; uuid: string | null };
  attendeePhoneNumber: string;
}

const createWorkflowReminderAndExtractPhone = async (
  args: CreateWorkflowReminderAndExtractPhoneArgs
): Promise<CreateWorkflowReminderAndExtractPhoneResult | null> => {
  const { evt, workflowStepId, scheduledDate, seatReferenceUid, submittedPhoneNumber } = args;
  // 1) Determine attendee phone first (fail early)
  let attendeePhoneNumber = extractPhoneNumber(evt?.responses) || submittedPhoneNumber;
  if (!attendeePhoneNumber) {
    if (!evt) {
      return null;
    }

    if (evt.attendees?.[0]?.phoneNumber) {
      attendeePhoneNumber = evt.attendees?.[0]?.phoneNumber;
    } else {
      throw new Error(`No attendee phone number found for workflow step ${workflowStepId}`);
    }
  }

  const workflowReminder = await prisma.workflowReminder.create({
    data: {
      bookingUid: evt?.uid,
      workflowStepId,
      method: WorkflowMethods.AI_PHONE_CALL,
      scheduledDate: scheduledDate.toDate(),
      scheduled: true,
      seatReferenceId: seatReferenceUid,
    },
  });

  return { workflowReminder, attendeePhoneNumber };
};

type ScheduleAIPhoneCallArgs = {
  submittedPhoneNumber: string | null;
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
  routedEventTypeId: number | null;
} & WorkflowContextData;

export type ScheduleAIPhoneCallArgsWithRequiredFields = Omit<ScheduleAIPhoneCallArgs, "workflowStepId"> & {
  workflowStepId: number; // Required
  agent: Agent;
  activePhoneNumber: string;
};

type Agent = {
  id: string;
  providerAgentId: string;
  outboundPhoneNumbers: {
    phoneNumber: string;
    subscriptionStatus: PhoneNumberSubscriptionStatus | null;
  }[];
};

export const scheduleAIPhoneCall = async (args: ScheduleAIPhoneCallArgs) => {
  const { workflowStepId, verifiedAt } = args;
  if (!workflowStepId) {
    logger.warn(`Workflow step ID is required for AI phone call scheduling`);
    return;
  }

  if (!verifiedAt) {
    logger.warn(`Workflow step ${workflowStepId} not yet verified`);
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
    logger.warn("Cal.ai voice agents are disabled - skipping AI phone call scheduling");
    return;
  }
  const params = { ...args, agent: workflowStep.agent, activePhoneNumber: activePhoneNumbers[0].phoneNumber };

  if (params.evt) {
    await scheduleAIPhoneCallForEvt(
      params as ScheduleAIPhoneCallArgsWithRequiredFields & { evt: BookingInfo }
    );
  } else {
    await scheduleAIPhoneCallForForm(
      params as ScheduleAIPhoneCallArgsWithRequiredFields & {
        formData: FormSubmissionData;
      }
    );
  }
};

const scheduleAIPhoneCallForEvt = async (
  args: ScheduleAIPhoneCallArgsWithRequiredFields & { evt: BookingInfo }
) => {
  const {
    evt,
    triggerEvent,
    timeSpan,
    workflowStepId,
    userId,
    teamId,
    seatReferenceUid,
    agent,
    activePhoneNumber,
  } = args;

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
      const reminderAndPhone = await createWorkflowReminderAndExtractPhone({
        evt,
        workflowStepId,
        scheduledDate,
        seatReferenceUid,
      });

      if (!reminderAndPhone) {
        logger.warn(`No phone number found for AI phone call workflow step ${workflowStepId} - skipping`);
        return;
      }

      const { workflowReminder, attendeePhoneNumber } = reminderAndPhone;

      // Schedule the actual AI phone call
      await scheduleAIPhoneCallTask({
        workflowReminderId: workflowReminder.id,
        scheduledDate: scheduledDate.toDate(),
        agentId: agent.id,
        phoneNumber: activePhoneNumber,
        attendeePhoneNumber,
        bookingUid: uid,
        userId,
        teamId,
        providerAgentId: agent.providerAgentId,
        referenceUid: workflowReminder.uuid || uuidv4(),
        formResponses: null,
        routedEventTypeId: null,
      });

      logger.info(`AI phone call scheduled for workflow step ${workflowStepId} at ${scheduledDate}`);
    } catch (error) {
      logger.error(`Error scheduling AI phone call with error ${error}`);
    }
  } else {
    // Execute immediately
    try {
      const reminderAndPhone = await createWorkflowReminderAndExtractPhone({
        evt,
        workflowStepId,
        scheduledDate: currentDate,
        seatReferenceUid,
      });

      if (!reminderAndPhone) {
        logger.warn(`No phone number found for AI phone call workflow step ${workflowStepId} - skipping`);
        return;
      }

      const { workflowReminder, attendeePhoneNumber } = reminderAndPhone;

      // Schedule the actual AI phone call immediately
      // Should i execute the task immediately or schedule it for later?
      await scheduleAIPhoneCallTask({
        workflowReminderId: workflowReminder.id,
        scheduledDate: currentDate.toDate(),
        agentId: agent.id,
        phoneNumber: activePhoneNumber,
        attendeePhoneNumber,
        bookingUid: uid,
        userId,
        teamId,
        providerAgentId: agent.providerAgentId,
        referenceUid: workflowReminder.uuid || uuidv4(),
        formResponses: null,
        routedEventTypeId: null,
      });

      logger.info(`AI phone call scheduled for immediate execution for workflow step ${workflowStepId}`);
    } catch (error) {
      logger.error(`Error scheduling immediate AI phone call with error ${error}`);
    }
  }
};

// sends all immediately, no scheduling needed (tasker handles scheduling)
const scheduleAIPhoneCallForForm = async (
  args: ScheduleAIPhoneCallArgsWithRequiredFields & {
    formData: FormSubmissionData;
  }
) => {
  const {
    formData,
    workflowStepId,
    userId,
    teamId,
    seatReferenceUid,
    submittedPhoneNumber,
    agent,
    activePhoneNumber,
    routedEventTypeId,
  } = args;

  try {
    const reminderAndPhone = await createWorkflowReminderAndExtractPhone({
      formData,
      workflowStepId,
      submittedPhoneNumber,
      scheduledDate: dayjs(),
      seatReferenceUid,
    });

    if (!reminderAndPhone) {
      logger.warn(`No phone number found for AI phone call workflow step ${workflowStepId} - skipping`);
      return;
    }

    const { workflowReminder, attendeePhoneNumber } = reminderAndPhone;

    await scheduleAIPhoneCallTask({
      workflowReminderId: workflowReminder.id,
      agentId: agent.id,
      phoneNumber: activePhoneNumber,
      attendeePhoneNumber,
      userId,
      teamId,
      scheduledDate: null,
      formResponses: formData.responses,
      bookingUid: null,
      providerAgentId: agent.providerAgentId,
      referenceUid: workflowReminder.uuid || uuidv4(),
      routedEventTypeId: routedEventTypeId ?? null,
    });
    logger.info(`AI phone call scheduled for immediate execution for workflow step ${workflowStepId}`);
  } catch (error) {
    logger.error(`Error scheduling immediate AI phone call with error ${error}`);
  }
};

interface ScheduleAIPhoneCallTaskArgs {
  workflowReminderId: number;
  scheduledDate: Date | null;
  agentId: string;
  phoneNumber: string;
  attendeePhoneNumber: string;
  bookingUid: string | null;
  userId: number | null;
  teamId: number | null;
  providerAgentId: string;
  referenceUid: string;
  formResponses: FORM_SUBMITTED_WEBHOOK_RESPONSES | null;
  routedEventTypeId: number | null;
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
    formResponses,
    routedEventTypeId,
  } = args;

  if (!formResponses && !bookingUid) {
    logger.warn("context missing for creating AI phone call task");
    return;
  }

  const featuresRepository = new FeaturesRepository(prisma);
  const calAIVoiceAgents = await featuresRepository.checkIfFeatureIsEnabledGlobally("cal-ai-voice-agents");
  if (!calAIVoiceAgents) {
    logger.warn("Cal.ai voice agents are disabled - skipping AI phone call");
    return;
  }

  if (userId) {
    await checkRateLimitAndThrowError({
      rateLimitingType: "core",
      identifier: `executeAIPhoneCall:${userId}`,
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
        responses: formResponses,
        routedEventTypeId,
      },
      {
        scheduledAt: scheduledDate || undefined,
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
