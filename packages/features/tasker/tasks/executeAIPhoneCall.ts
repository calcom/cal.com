import { z } from "zod";

import { CAL_AI_AGENT_PHONE_NUMBER_FIELD } from "@calcom/features/bookings/lib/SystemField";
import { createDefaultAIPhoneServiceProvider } from "@calcom/features/ee/cal-ai-phone";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

// Zod schema for phone number fields in booking responses
const phoneNumberFieldsSchema = z.object({
  [CAL_AI_AGENT_PHONE_NUMBER_FIELD]: z.string().optional(),
  attendeePhoneNumber: z.string().optional(),
});

interface ExecuteAIPhoneCallPayload {
  workflowReminderId: number;
  agentId: string;
  fromNumber: string;
  toNumber: string;
  bookingUid: string;
  userId: number | null;
  teamId: number | null;
}

export async function executeAIPhoneCall(payload: string) {
  const data: ExecuteAIPhoneCallPayload = JSON.parse(payload);

  console.log("=== EXECUTING AI PHONE CALL TASK ===");
  console.log("Payload:", data);
  logger.info(`Executing AI phone call for workflow reminder ${data.workflowReminderId}`, data);

  try {
    // Check if the workflow reminder still exists and is scheduled
    const workflowReminder = await prisma.workflowReminder.findUnique({
      where: { id: data.workflowReminderId },
      include: {
        workflowStep: {
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
        },
        booking: {
          include: {
            attendees: {
              select: {
                name: true,
                email: true,
                phoneNumber: true,
              },
            },
            eventType: {
              select: {
                title: true,
              },
            },
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    console.log("Workflow reminder found:", workflowReminder);

    if (!workflowReminder || !workflowReminder.scheduled) {
      logger.warn(`Workflow reminder ${data.workflowReminderId} not found or not scheduled`);
      throw new Error("Reminder not found or not scheduled");
    }

    // Check rate limits
    if (data.userId) {
      await checkRateLimitAndThrowError({
        rateLimitingType: "core",
        identifier: `ai-phone-call:${data.userId}`,
      });
    }

    // Get booking details for dynamic variables
    const booking = workflowReminder.booking;
    if (!booking) {
      logger.warn(`No booking found for workflow reminder ${data.workflowReminderId}`);
      throw new Error("No booking found");
    }

    console.log("Booking found:", {
      uid: booking.uid,
      responses: booking.responses,
      attendees: booking.attendees,
    });

    // Use the correct phone number logic - access from booking responses using proper Zod schema
    const phoneNumberFields = booking.responses
      ? phoneNumberFieldsSchema.safeParse(booking.responses)
      : { success: false, data: {} };
    let attendeePhoneNumber: string | undefined;

    // Handle nested response structure where phone numbers are stored as objects
    if (booking.responses) {
      // Check for attendeePhoneNumber in the nested structure
      const attendeePhoneResponse = booking.responses.attendeePhoneNumber;
      if (
        attendeePhoneResponse &&
        typeof attendeePhoneResponse === "object" &&
        "value" in attendeePhoneResponse
      ) {
        attendeePhoneNumber = attendeePhoneResponse.value as string;
      }

      // Check for aiAgentCallPhoneNumber in the nested structure
      const aiAgentPhoneResponse = booking.responses[CAL_AI_AGENT_PHONE_NUMBER_FIELD];
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

    const finalPhoneNumber = attendeePhoneNumber || data.toNumber; // Fallback to the provided toNumber

    console.log("Phone number extraction in task:", {
      bookingResponses: booking.responses,
      phoneNumberFields,
      attendeePhoneNumber,
      finalPhoneNumber,
      CAL_AI_AGENT_PHONE_NUMBER_FIELD,
    });

    if (!finalPhoneNumber) {
      logger.warn(`No phone number found for attendee in booking ${booking.uid}`);
      throw new Error("No phone number found for attendee");
    }

    // Prepare dynamic variables for the AI call
    const dynamicVariables = {
      guestName: booking.attendees[0]?.name || "",
      guestEmail: booking.attendees[0]?.email || "",
      guestCompany: "",
      schedulerName: booking.user?.name || "",
      eventName: booking.eventType?.title || "",
      eventDate: booking.startTime.toISOString(),
    };

    console.log("Dynamic variables:", dynamicVariables);

    const aiService = createDefaultAIPhoneServiceProvider();

    console.log("Creating AI phone call with:", {
      from_number: data.fromNumber,
      to_number: finalPhoneNumber,
      dynamicVariables,
    });

    const call = await aiService.createPhoneCall({
      from_number: data.fromNumber,
      to_number: finalPhoneNumber,
      dynamicVariables,
    });

    console.log("AI phone call created successfully:", call);

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
      toNumber: finalPhoneNumber,
      bookingUid: data.bookingUid,
    });

    console.log("=== AI PHONE CALL TASK COMPLETED SUCCESSFULLY ===");
  } catch (error) {
    console.error("=== AI PHONE CALL TASK FAILED ===");
    console.error("Error:", error);
    logger.error("Error executing AI phone call:", error);
    throw error;
  }
}
