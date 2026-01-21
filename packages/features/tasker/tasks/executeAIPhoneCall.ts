import type { FORM_SUBMITTED_WEBHOOK_RESPONSES } from "@calcom/app-store/routing-forms/lib/formSubmissionUtils";
import dayjs from "@calcom/dayjs";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import { handleInsufficientCredits } from "@calcom/features/ee/billing/helpers/handleInsufficientCredits";
import { formatIdentifierToVariable } from "@calcom/features/ee/workflows/lib/reminders/templates/customTemplate";
import { WorkflowReminderRepository } from "@calcom/features/ee/workflows/lib/repository/workflowReminder";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import {
  getSubmitterEmail,
  getSubmitterName,
} from "@calcom/features/tasker/tasks/triggerFormSubmittedNoEvent/formSubmissionValidation";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { CreditUsageType } from "@calcom/prisma/enums";

interface ExecuteAIPhoneCallPayload {
  workflowReminderId: number;
  agentId: string;
  fromNumber: string;
  toNumber: string;
  bookingUid: string | null;
  userId: number | null;
  teamId: number | null;
  providerAgentId: string;
  responses?: FORM_SUBMITTED_WEBHOOK_RESPONSES | null;
  routedEventTypeId?: number | null;
}
const log = logger.getSubLogger({ prefix: [`[[executeAIPhoneCall] `] });

type BookingWithRelations = NonNullable<
  NonNullable<
    Awaited<ReturnType<typeof WorkflowReminderRepository.findWorkflowReminderForAIPhoneCallExecution>>
  >["booking"]
>;

function getVariablesFromFormResponse({
  responses,
  eventTypeId,
  numberToCall,
}: {
  responses: FORM_SUBMITTED_WEBHOOK_RESPONSES;
  eventTypeId: number | null;
  numberToCall: string;
}) {
  const submittedEmail = getSubmitterEmail(responses);
  const submittedName = getSubmitterName(responses);

  return {
    ATTENDEE_NAME: submittedName || "",
    ATTENDEE_EMAIL: submittedEmail || "",
    NUMBER_TO_CALL: numberToCall,
    eventTypeId: eventTypeId?.toString() || "",
    // Include any custom form responses
    ...Object.fromEntries(
      Object.entries(responses || {}).map(([key, value]) => [
        formatIdentifierToVariable(key),
        value.value?.toString() || "",
      ])
    ),
  };
}

function getVariablesFromBooking(booking: BookingWithRelations, numberToCall: string) {
  const attendee = booking.attendees[0];
  const timeZone = booking.user?.timeZone || attendee?.timeZone || "UTC";

  const { responses } = getCalEventResponses({
    bookingFields: booking.eventType?.bookingFields ?? null,
    booking: {
      ...booking,
      customInputs: null,
    },
  });

  const attendeeNameWords = attendee?.name?.trim().split(" ") || [];
  const attendeeFirstName = attendeeNameWords[0] || "";
  const attendeeLastName =
    attendeeNameWords.length > 1 ? attendeeNameWords[attendeeNameWords.length - 1] : "";

  return {
    EVENT_NAME: booking.eventType?.title || "",
    EVENT_DATE: dayjs(booking.startTime).tz(timeZone).format("dddd, MMMM D, YYYY"),
    EVENT_TIME: dayjs(booking.startTime).tz(timeZone).format("h:mm A"),
    EVENT_END_TIME: dayjs(booking.endTime).tz(timeZone).format("h:mm A"),
    TIMEZONE: timeZone,
    LOCATION: booking.location || "",
    ORGANIZER_NAME: booking.user?.name || "",
    ATTENDEE_NAME: attendee?.name || "",
    ATTENDEE_FIRST_NAME: attendeeFirstName,
    ATTENDEE_LAST_NAME: attendeeLastName,
    ATTENDEE_EMAIL: attendee?.email || "",
    NUMBER_TO_CALL: numberToCall,
    ATTENDEE_TIMEZONE: attendee?.timeZone || "",
    ADDITIONAL_NOTES: booking.description || "",
    EVENT_START_TIME_IN_ATTENDEE_TIMEZONE: dayjs(booking.startTime)
      .tz(attendee?.timeZone || timeZone)
      .format("h:mm A"),
    EVENT_END_TIME_IN_ATTENDEE_TIMEZONE: dayjs(booking.endTime)
      .tz(attendee?.timeZone || timeZone)
      .format("h:mm A"),
    // DO NOT REMOVE THIS FIELD. It is used for conditional tool routing in prompts
    eventTypeId: booking.eventTypeId?.toString() || "",
    // Include any custom form responses
    ...Object.fromEntries(
      Object.entries(responses || {}).map(([key, value]) => [
        formatIdentifierToVariable(key),
        value.value?.toString() || "",
      ])
    ),
  };
}

export async function executeAIPhoneCall(payload: string) {
  let data: ExecuteAIPhoneCallPayload;
  try {
    data = JSON.parse(payload);
  } catch (error) {
    log.error("Failed to parse AI phone call payload", { error, payload });
    throw new Error("Invalid JSON payload");
  }

  const featuresRepository = new FeaturesRepository(prisma);
  const calAIVoiceAgents = await featuresRepository.checkIfFeatureIsEnabledGlobally("cal-ai-voice-agents");

  if (!calAIVoiceAgents) {
    log.warn("Cal.ai voice agents are disabled - skipping AI phone call");
    return;
  }

  log.info(`Executing AI phone call for workflow reminder ${data.workflowReminderId}`, data);

  try {
    const workflowReminder = await WorkflowReminderRepository.findWorkflowReminderForAIPhoneCallExecution(
      data.workflowReminderId
    );

    if (!workflowReminder || !workflowReminder.scheduled) {
      log.warn(`Workflow reminder ${data.workflowReminderId} not found or not scheduled`);
      throw new Error("Reminder not found or not scheduled");
    }

    if (data.userId || data.teamId) {
      const { CreditService } = await import("@calcom/features/ee/billing/credit-service");
      const creditService = new CreditService();

      const hasCredits = await creditService.hasAvailableCredits({
        userId: data.userId || undefined,
        teamId: data.teamId || undefined,
      });

      if (!hasCredits) {
        log.warn(`Insufficient credits for AI phone call for workflow reminder ${data.workflowReminderId}`, {
          userId: data.userId,
          teamId: data.teamId,
          workflowReminderId: data.workflowReminderId,
          bookingUid: workflowReminder.booking?.uid,
        });

        await handleInsufficientCredits({
          userId: data.userId,
          teamId: data.teamId,
          creditFor: CreditUsageType.CAL_AI_PHONE_CALL,
          prismaClient: prisma,
          context: {
            workflowReminderId: data.workflowReminderId,
            bookingUid: workflowReminder.booking?.uid,
          },
        });

        return;
      }
    }

    const rateLimitIdentifier = data.teamId
      ? `executeAIPhoneCall:team-${data.teamId}`
      : data.userId
      ? `executeAIPhoneCall:user-${data.userId}`
      : null;

    if (!rateLimitIdentifier) {
      log.warn(`No rate limit identifier found for AI phone call. This should not happen.`, {
        userId: data.userId,
        teamId: data.teamId,
        workflowReminderId: data.workflowReminderId,
      });
      throw new Error("No rate limit identifier found for AI phone call. This should not happen.");
    }

    // TODO: add better rate limiting for AI phone calls
    await checkRateLimitAndThrowError({
      rateLimitingType: "core",
      identifier: rateLimitIdentifier,
    });

    // form triggers don't have a booking
    const booking = workflowReminder.booking as BookingWithRelations | null;
    const routingFormResponses = data.responses;

    if (!booking && !routingFormResponses) {
      log.warn(`No form responses or booking found for workflow reminder ${data.workflowReminderId}`);
      throw new Error("No booking, response, or form responses found");
    }

    const numberToCall = data.toNumber;
    if (!numberToCall) {
      log.warn(`No phone number found in booking ${booking?.uid} or the routing form responses`);
      throw new Error("No phone number found");
    }

    type VariablesType = {
      ATTENDEE_EMAIL: string;
      ATTENDEE_NAME: string;
      NUMBER_TO_CALL: string;
      eventTypeId: string;
    } & Partial<ReturnType<typeof getVariablesFromBooking>>;

    // Prefer response variables if present, else fall back to booking
    let dynamicVariables: VariablesType | undefined;
    if (routingFormResponses) {
      const workflowStep = workflowReminder.workflowStep;
      const eventTypeId =
        data.routedEventTypeId ??
        (workflowStep?.workflow.trigger === "FORM_SUBMITTED"
          ? workflowStep.agent?.outboundEventTypeId
          : null);
      if (!eventTypeId) {
        log.warn(
          `Form not routed to an event type and no event type id found for workflow reminder ${data.workflowReminderId}`
        );
        return;
      }
      dynamicVariables = getVariablesFromFormResponse({
        responses: routingFormResponses,
        eventTypeId,
        numberToCall,
      });
    } else if (booking) {
      dynamicVariables = getVariablesFromBooking(booking, numberToCall);
    }

    if (!dynamicVariables) return;

    const aiService = createDefaultAIPhoneServiceProvider();

    await aiService.updateToolsFromAgentId(data.providerAgentId, {
      eventTypeId: dynamicVariables.eventTypeId ? Number(dynamicVariables.eventTypeId) : null,
      timeZone: dynamicVariables.TIMEZONE || "UTC",
      userId: data.userId,
      teamId: data.teamId,
    });

    const call = await aiService.createPhoneCall({
      fromNumber: data.fromNumber,
      toNumber: numberToCall,
      dynamicVariables,
    });

    log.info("AI phone call created successfully:", call);

    await WorkflowReminderRepository.updateWorkflowReminderReferenceAndScheduled(data.workflowReminderId, {
      referenceId: call.call_id,
      scheduled: true,
    });

    log.info(`AI phone call executed successfully for workflow reminder ${data.workflowReminderId}`, {
      callId: call.call_id,
      agentId: data.agentId,
      fromNumber: data.fromNumber,
      toNumber: numberToCall,
      bookingUid: data.bookingUid,
      workflowReminderId: data.workflowReminderId,
    });
  } catch (error) {
    log.error("Error executing AI phone call:", error);
    throw error;
  }
}
