import dayjs from "@calcom/dayjs";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

interface ExecuteAIPhoneCallPayload {
  workflowReminderId: number;
  agentId: string;
  fromNumber: string;
  toNumber: string;
  bookingUid: string;
  userId: number | null;
  teamId: number | null;
  providerAgentId: string;
}

export async function executeAIPhoneCall(payload: string) {
  let data: ExecuteAIPhoneCallPayload;
  try {
    data = JSON.parse(payload);
  } catch (error) {
    logger.error("Failed to parse AI phone call payload", { error, payload });
    throw new Error("Invalid JSON payload");
  }

  logger.info(`Executing AI phone call for workflow reminder ${data.workflowReminderId}`, data);

  try {
    // Check if the workflow reminder still exists and is scheduled
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
                outboundPhoneNumbers: {
                  select: {
                    phoneNumber: true,
                  },
                },
              },
            },
          },
        },
        booking: {
          select: {
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
          },
        },
      },
    });

    if (!workflowReminder || !workflowReminder.scheduled) {
      logger.warn(`Workflow reminder ${data.workflowReminderId} not found or not scheduled`);
      throw new Error("Reminder not found or not scheduled");
    }

    // Check if user/team has sufficient credits before making the call
    if (data.userId || data.teamId) {
      const { CreditService } = await import("@calcom/features/ee/billing/credit-service");
      const creditService = new CreditService();
      const credits = await creditService.getAllCredits({
        userId: data.userId || undefined,
        teamId: data.teamId || undefined,
      });

      const availableCredits =
        (credits?.totalRemainingMonthlyCredits || 0) + (credits?.additionalCredits || 0);
      const requiredCredits = 5;

      if (availableCredits < requiredCredits) {
        logger.warn(`Insufficient credits for AI phone call`, {
          userId: data.userId,
          teamId: data.teamId,
          availableCredits,
          requiredCredits,
          workflowReminderId: data.workflowReminderId,
        });
        throw new Error(
          `Insufficient credits to make AI phone call. Need ${requiredCredits} credits, have ${availableCredits}. Please purchase more credits.`
        );
      }
    }

    // TODO: add better rate limiting for AI phone calls
    if (data.userId) {
      await checkRateLimitAndThrowError({
        rateLimitingType: "core",
        identifier: `ai-phone-call:${data.userId}`,
      });
    }

    const booking = workflowReminder.booking;
    if (!booking) {
      logger.warn(`No booking found for workflow reminder ${data.workflowReminderId}`);
      throw new Error("No booking found");
    }

    const numberToCall = data.toNumber;

    if (!numberToCall) {
      logger.warn(`No phone number found for attendee in booking ${booking.uid}`);
      throw new Error("No phone number found for attendee");
    }

    // Prepare dynamic variables for the AI call using the same format as workflow system
    const attendee = booking.attendees[0];
    const timeZone = booking.user?.timeZone || attendee?.timeZone || "UTC";

    // Get form responses if available
    const { responses } = getCalEventResponses({
      bookingFields: booking.eventType?.bookingFields ?? null,
      booking: booking,
    });

    // Split attendee name into first and last name
    const attendeeNameWords = attendee?.name?.trim().split(" ") || [];
    const attendeeNameWordCount = attendeeNameWords.length;
    const attendeeFirstName = attendeeNameWords[0] || "";
    const attendeeLastName = attendeeNameWordCount > 1 ? attendeeNameWords[attendeeNameWordCount - 1] : "";

    const dynamicVariables = {
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
      ATTENDEE_TIMEZONE: attendee?.timeZone || "",
      ADDITIONAL_NOTES: booking.description || "",
      EVENT_START_TIME_IN_ATTENDEE_TIMEZONE: dayjs(booking.startTime)
        .tz(attendee?.timeZone || timeZone)
        .format("h:mm A"),
      EVENT_END_TIME_IN_ATTENDEE_TIMEZONE: dayjs(booking.endTime)
        .tz(attendee?.timeZone || timeZone)
        .format("h:mm A"),
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

    const aiService = createDefaultAIPhoneServiceProvider();

    // Update general tools before making the call so that the agent can use the check_availability_cal and book_appointment_cal tools
    await aiService.updateToolsFromAgentId(data.providerAgentId, {
      eventTypeId: booking.eventTypeId,
      timeZone: booking.attendees[0]?.timeZone ?? "Europe/London",
      userId: data.userId,
      teamId: data.teamId,
    });

    const call = await aiService.createPhoneCall({
      from_number: data.fromNumber,
      to_number: numberToCall,
      retell_llm_dynamic_variables: dynamicVariables,
    });

    logger.info("AI phone call created successfully:", call);

    // Update the workflow reminder with the call reference
    await prisma.workflowReminder.update({
      where: { id: data.workflowReminderId },
      data: {
        referenceId: call.call_id,
        scheduled: true,
      },
    });

    logger.info(`AI phone call executed successfully for workflow reminder ${data.workflowReminderId}`, {
      callId: call.call_id,
      agentId: data.agentId,
      fromNumber: data.fromNumber,
      toNumber: numberToCall,
      bookingUid: data.bookingUid,
    });
  } catch (error) {
    console.error("=== AI PHONE CALL TASK FAILED ===");
    console.error("Error:", error);
    logger.error("Error executing AI phone call:", error);
    throw error;
  }
}
