import type { FORM_SUBMITTED_WEBHOOK_RESPONSES } from "@calcom/app-store/routing-forms/lib/formSubmissionUtils";
import dayjs from "@calcom/dayjs";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import {
  getSubmitterEmail,
  getSubmitterName,
} from "@calcom/features/tasker/tasks/triggerFormSubmittedNoEvent/formSubmissionValidation";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

interface ExecuteAIPhoneCallPayload {
  workflowReminderId: number;
  agentId: string;
  fromNumber: string;
  toNumber: string;
  bookingUid: string | null;
  userId: number | null;
  teamId: number | null;
  providerAgentId: string;
  responses: FORM_SUBMITTED_WEBHOOK_RESPONSES | null;
}
const log = logger.getSubLogger({ prefix: [`[[executeAIPhoneCall] `] });

const bookingSelect = {
  uid: true,
  startTime: true,
  endTime: true,
  eventTypeId: true,
  responses: true,
  location: true,
  description: true,
  attendees: {
    select: {
      name: true,
      email: true,
      phoneNumber: true,
      timeZone: true,
    },
  },
  eventType: {
    select: {
      title: true,
      bookingFields: true,
    },
  },
  user: {
    select: {
      name: true,
      timeZone: true,
    },
  },
} satisfies Prisma.BookingSelect;

type BookingWithRelations = Prisma.BookingGetPayload<{
  select: typeof bookingSelect;
}>;

function getVariablesFromFormResponse(responses: FORM_SUBMITTED_WEBHOOK_RESPONSES, numberToCall: string) {
  const submittedEmail = getSubmitterEmail(responses);
  const submittedName = getSubmitterName(responses);

  return {
    ATTENDEE_NAME: submittedName || "",
    ATTENDEE_EMAIL: submittedEmail || "",
    NUMBER_TO_CALL: numberToCall,
    eventTypeId: "27", // TODO: I need the chosen route
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
    eventTypeId: booking.eventTypeId || 0,
    // Include any custom form responses
    ...Object.fromEntries(
      Object.entries(responses || {}).map(([key, value]) => [
        key
          .replace(/[^a-zA-Z0-9 ]/g, "")
          .trim()
          .replaceAll(" ", "_")
          .toUpperCase(),
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
    log.warn("Cal AI voice agents are disabled - skipping AI phone call");
    return;
  }

  log.info(`Executing AI phone call for workflow reminder ${data.workflowReminderId}`, data);

  try {
    const workflowReminder = await prisma.workflowReminder.findUnique({
      where: { id: data.workflowReminderId },
      select: {
        id: true,
        scheduled: true,
        referenceId: true,
        workflowStep: {
          select: {
            agent: {
              select: {
                outboundPhoneNumbers: { select: { phoneNumber: true } },
              },
            },
          },
        },
        booking: { select: bookingSelect },
      },
    });

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
        log.warn(`Insufficient credits for AI phone call`, {
          userId: data.userId,
          teamId: data.teamId,
          workflowReminderId: data.workflowReminderId,
          bookingUid: workflowReminder.booking?.uid,
        });
        throw new Error(
          `Insufficient credits to make AI phone call. Please purchase more credits. user: ${data?.userId}, team: ${data?.teamId}`
        );
      }
    }

    const rateLimitIdentifier = data.teamId
      ? `ai-phone-call:team:${data.teamId}`
      : data.userId
      ? `ai-phone-call:user:${data.userId}`
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
    const responses = data.responses;

    if (!booking && !responses) {
      log.warn(`No form responses or booking found for workflow reminder ${data.workflowReminderId}`);
      throw new Error("No booking, response, or form responses found");
    }

    const numberToCall = data.toNumber;
    if (!numberToCall) {
      log.warn(`No phone number found in booking ${booking?.uid} or response ${response?.uuid}`);
      throw new Error("No phone number found");
    }

    type VariablesType = {
      ATTENDEE_EMAIL: string;
      ATTENDEE_NAME: string;
      NUMBER_TO_CALL: string;
      eventTypeId: number;
    } & Partial<ReturnType<typeof getVariablesFromBooking>>;

    // Prefer response variables if present, else fall back to booking
    let dynamicVariables: VariablesType | undefined;
    if (responses) dynamicVariables = getVariablesFromFormResponse(responses, numberToCall);
    else if (booking) dynamicVariables = getVariablesFromBooking(booking, numberToCall);

    if (!dynamicVariables) return;

    const aiService = createDefaultAIPhoneServiceProvider();

    await aiService.updateToolsFromAgentId(data.providerAgentId, {
      eventTypeId: dynamicVariables.eventTypeId,
      timeZone: dynamicVariables.TIMEZONE || "UTC",
      userId: data.userId,
      teamId: data.teamId,
    });

    console.log(
      `create phone call with:  ${JSON.stringify({
        fromNumber: data.fromNumber,
        toNumber: numberToCall,
        dynamicVariables,
      })}`
    );

    const call = await aiService.createPhoneCall({
      fromNumber: data.fromNumber,
      toNumber: numberToCall,
      dynamicVariables,
    });

    log.info("AI phone call created successfully:", call);

    await prisma.workflowReminder.update({
      where: { id: data.workflowReminderId },
      data: {
        referenceId: call.call_id,
        scheduled: true,
      },
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
