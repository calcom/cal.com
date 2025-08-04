import { createDefaultAIPhoneServiceProvider } from "@calcom/features/ee/cal-ai-phone";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import logger from "@calcom/lib/logger";
import { CreditsRepository } from "@calcom/lib/server/repository/credits";
import prisma from "@calcom/prisma";

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

    // Check if user/team has sufficient credits before making the call
    if (data.userId || data.teamId) {
      const hasCredits = await CreditsRepository.hasAvailableCredits({
        userId: data.userId || undefined,
        teamId: data.teamId || undefined,
        creditsRequired: 5, // Minimum 5 credits required for AI phone calls
      });

      if (!hasCredits) {
        logger.warn(`Insufficient credits for AI phone call`, {
          userId: data.userId,
          teamId: data.teamId,
          workflowReminderId: data.workflowReminderId,
        });
        throw new Error("Insufficient credits to make AI phone call. Please purchase more credits.");
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

    console.log("Booking found:", {
      uid: booking.uid,
      responses: booking.responses,
      attendees: booking.attendees,
    });

    const numberToCall = data.toNumber;

    if (!numberToCall) {
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
      // TODO:Add more dynamic variables
    };

    console.log("Dynamic variables:", dynamicVariables);

    const aiService = createDefaultAIPhoneServiceProvider();

    console.log("Creating AI phone call with:", {
      from_number: data.fromNumber,
      to_number: numberToCall,
      dynamicVariables,
    });

    const call = await aiService.createPhoneCall({
      from_number: data.fromNumber,
      to_number: numberToCall,
      retell_llm_dynamic_variables: dynamicVariables,
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
      toNumber: numberToCall,
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
