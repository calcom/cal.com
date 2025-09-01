import { Frequency as CalFrequency } from "@calcom/prisma/zod-utils";
import type { CalendarEvent, EventBusyDate, RecurringEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import config from "../config.json";
import { kyzonCredentialKeySchema, type KyzonCredentialKey } from "./KyzonCredentialKey";
import type {
  KyzonGetCalendarEventResponse,
  KyzonCreateOrPutCalendarEventRequestBody,
  KyzonCreateSpaceCallRequestBody,
  KyzonGetSpaceCallsWithinRangeRequestQuery,
  KyzonSpaceCallResponse,
  KyzonSingleSpaceCallWithinRangeResponse,
  KyzonCalendarEventRecurrence,
} from "./apiTypes";
import { kyzonAxiosInstance } from "./axios";
import { refreshKyzonToken, isTokenExpired } from "./tokenManager";

const KyzonVideoApiAdapter = (credential: CredentialPayload): VideoApiAdapter => {
  const getRefreshedKey = async (): Promise<KyzonCredentialKey> => {
    let key = kyzonCredentialKeySchema.parse(credential.key);

    // Check if token needs refresh and has refresh capability
    if (isTokenExpired(key)) {
      const refreshedToken = await refreshKyzonToken(credential.id);
      if (refreshedToken) {
        key = refreshedToken;
      }
    }

    return key;
  };

  const createMeeting = async (event: CalendarEvent): Promise<VideoCallData> => {
    const key = await getRefreshedKey();

    const { data: spaceCallData } = await kyzonAxiosInstance.post<KyzonSpaceCallResponse>(
      `/v1/teams/${key.team_id}/space/calls`,
      {
        name: event.title,
        isScheduled: true,
      } satisfies KyzonCreateSpaceCallRequestBody,
      {
        headers: {
          Authorization: `Bearer ${key.access_token}`,
        },
      }
    );

    const { data: calendarData } = await kyzonAxiosInstance.post<KyzonGetCalendarEventResponse>(
      `/v1/teams/${key.team_id}/calendar-events`,
      {
        title: event.title,
        description: event.description ?? undefined,
        location: {
          spaceCallId: spaceCallData.id,
        },
        isAllDay: false,
        timezone: event.organizer?.timeZone || "Etc/UTC",
        startDateUtcISOString: event.startTime,
        endDateUtcISOString: event.endTime,
        recurrence: event.recurringEvent ? convertCalRecurrenceToKyzon(event.recurringEvent) : undefined,
        invitees: event.attendees?.map((attendee) => ({
          email: attendee.email,
        })),
        thirdPartySource: {
          calendarSource: "Cal.com",
          eventId: event.uid || "",
        },
        hasWaitRoom: false,
      } satisfies KyzonCreateOrPutCalendarEventRequestBody,
      {
        headers: {
          Authorization: `Bearer ${key.access_token}`,
        },
      }
    );

    return {
      type: config.type,
      id: calendarData.id,
      password: calendarData.meetingPassword || spaceCallData.password,
      url: calendarData.meetingLink || spaceCallData.url,
    };
  };

  return {
    createMeeting,

    updateMeeting: async (bookingRef: PartialReference, event: CalendarEvent): Promise<VideoCallData> => {
      const key = await getRefreshedKey();

      if (!bookingRef.meetingId) {
        return await createMeeting(event);
      }

      try {
        const { data: updatedCalendarEvent } = await kyzonAxiosInstance.put<KyzonGetCalendarEventResponse>(
          `/v1/teams/${key.team_id}/calendar-events/${bookingRef.meetingId}`,
          {
            title: event.title,
            description: event.description ?? undefined,
            isAllDay: false,
            timezone: event.organizer?.timeZone || "Etc/UTC",
            startDateUtcISOString: event.startTime,
            endDateUtcISOString: event.endTime,
            recurrence: event.recurringEvent ? convertCalRecurrenceToKyzon(event.recurringEvent) : undefined,
            invitees: event.attendees?.map((attendee) => ({
              email: attendee.email,
            })),
            thirdPartySource: {
              calendarSource: "Cal.com",
              eventId: event.uid || "",
            },
            hasWaitRoom: false,
          } satisfies KyzonCreateOrPutCalendarEventRequestBody,
          {
            headers: {
              Authorization: `Bearer ${key.access_token}`,
            },
          }
        );

        return {
          type: config.type,
          id: updatedCalendarEvent.id,
          password: updatedCalendarEvent.meetingPassword || "",
          url: updatedCalendarEvent.meetingLink || "",
        };
      } catch (error) {
        // If update fails, return existing meeting data
        return {
          type: config.type,
          id: bookingRef.meetingId,
          password: bookingRef.meetingPassword || "",
          url: bookingRef.meetingUrl || "",
        };
      }
    },

    deleteMeeting: async (uid: string): Promise<void> => {
      const key = await getRefreshedKey();

      try {
        await kyzonAxiosInstance.delete(`/v1/teams/${key.team_id}/calendar-events/${uid}`, {
          headers: {
            Authorization: `Bearer ${key.access_token}`,
          },
        });
      } catch (error) {
        // Don't throw error if calendar event deletion fails
        // as it might have already been deleted or expired
        console.warn(`Failed to delete KYZON calendar event ${uid}:`, error);
      }
    },

    getAvailability: async (dateFrom?: string, dateTo?: string): Promise<EventBusyDate[]> => {
      if (!dateFrom || !dateTo) {
        return [];
      }

      const key = await getRefreshedKey();

      try {
        const response = await kyzonAxiosInstance.get<KyzonSingleSpaceCallWithinRangeResponse[]>(
          `/v1/teams/${key.team_id}/space/calls`,
          {
            params: {
              startDateUtcISOString: dateFrom,
              endDateUtcISOString: dateTo,
            } satisfies KyzonGetSpaceCallsWithinRangeRequestQuery,
            headers: {
              Authorization: `Bearer ${key.access_token}`,
            },
          }
        );

        const spaceCalls = response.data;

        return spaceCalls.reduce<EventBusyDate[]>((acc, call) => {
          if (!call.eventTime.endTimeUtcISOString) {
            // ongoing / all-day event, don't count it as a busy date
            return acc;
          }

          acc.push({
            start: call.eventTime.startTimeUtcISOString,
            end: call.eventTime.endTimeUtcISOString,
            source: "KYZON Space",
          });

          return acc;
        }, []);
      } catch (error) {
        console.warn("Failed to get KYZON Space availability:", error);
        return [];
      }
    },
  };
};

export default KyzonVideoApiAdapter;

/**
 * Converts Cal.com's RecurringEvent format to KYZON Space's Recurrence format
 */
function convertCalRecurrenceToKyzon(
  calRecurrence: RecurringEvent
): KyzonCalendarEventRecurrence | undefined {
  if (!calRecurrence) return undefined;

  let frequency: KyzonCalendarEventRecurrence["frequency"];

  switch (calRecurrence.freq) {
    case CalFrequency.DAILY: {
      frequency = "DAILY";
      break;
    }
    case CalFrequency.WEEKLY: {
      frequency = "WEEKLY";
      break;
    }
    case CalFrequency.MONTHLY: {
      frequency = "MONTHLY";
      break;
    }
    case CalFrequency.YEARLY: {
      frequency = "YEARLY";
      break;
    }
    default:
      // KYZON doesn't support HOURLY, MINUTELY, SECONDLY
      return undefined;
  }

  return {
    frequency,
    interval: calRecurrence.interval || 1,
    count: calRecurrence.count > 0 ? calRecurrence.count : undefined,
    untilDateUtcISOString: calRecurrence.until ? calRecurrence.until.toISOString() : undefined,
  };
}
