import type { TFunction } from "i18next";

import dayjs from "@calcom/dayjs";
import { sendCreditBalanceLimitReachedEmails } from "@calcom/emails/email-manager";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import { UserRepository } from "@calcom/lib/server/repository/user";
import prisma from "@calcom/prisma";
import { CreditUsageType } from "@calcom/prisma/enums";

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
const log = logger.getSubLogger({ prefix: [`[[executeAIPhoneCall] `] });

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

        try {
          let teamWithAdmins:
            | {
                id: number;
                name: string;
                adminAndOwners: { id: number; name: string | null; email: string; t: TFunction }[];
              }
            | undefined;
          let user:
            | {
                id: number;
                name: string | null;
                email: string;
                t: TFunction;
              }
            | undefined;

          if (data.teamId) {
            const teamRepository = new TeamRepository(prisma);
            const team = await teamRepository.findTeamWithAdminMembers({ teamId: data.teamId });

            if (team) {
              teamWithAdmins = {
                id: team.id,
                name: team.name ?? "",
                adminAndOwners: await Promise.all(
                  team.members.map(async (member) => ({
                    id: member.user.id,
                    name: member.user.name,
                    email: member.user.email,
                    t: await getTranslation(member.user.locale ?? "en", "common"),
                  }))
                ),
              };
            }
          } else if (data.userId) {
            const userRepository = new UserRepository(prisma);
            const userRecord = await userRepository.findById({ id: data.userId });

            if (userRecord) {
              user = {
                id: userRecord.id,
                name: userRecord.name,
                email: userRecord.email,
                t: await getTranslation(userRecord.locale ?? "en", "common"),
              };
            }
          }

          if (teamWithAdmins || user) {
            await sendCreditBalanceLimitReachedEmails({
              team: teamWithAdmins,
              user,
              creditFor: CreditUsageType.CAL_AI_PHONE_CALL,
            });
            log.info("Credit limit reached email sent for AI phone call", {
              userId: data.userId,
              teamId: data.teamId,
            });
          }
        } catch (emailError) {
          log.error("Failed to send credit limit email for AI phone call", emailError);
        }

        return;
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
    if (rateLimitIdentifier) {
      await checkRateLimitAndThrowError({
        rateLimitingType: "core",
        identifier: rateLimitIdentifier,
      });
    }

    const booking = workflowReminder.booking;
    if (!booking) {
      log.warn(`No booking found for workflow reminder ${data.workflowReminderId}`);
      throw new Error("No booking found");
    }

    const numberToCall = data.toNumber;

    if (!numberToCall) {
      log.warn(`No phone number found for attendee in booking ${booking.uid}`);
      throw new Error("No phone number found for attendee");
    }

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

    await aiService.updateToolsFromAgentId(data.providerAgentId, {
      eventTypeId: booking.eventTypeId,
      timeZone: attendee?.timeZone ?? "Europe/London",
      userId: data.userId,
      teamId: data.teamId,
    });

    const call = await aiService.createPhoneCall({
      fromNumber: data.fromNumber,
      toNumber: numberToCall,
      dynamicVariables,
    });

    log.info("AI phone call created successfully:", call);

    // Update the workflow reminder with the call reference
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
    });
  } catch (error) {
    log.error("Error executing AI phone call:", error);
    throw error;
  }
}
