import { calendarServicesMapMock } from "@tests/libs/__mocks__/app-store";

import { BookingLocations } from "./bookingScenario";

import type { CredentialForCalendarService } from "@calcom/app-store/_utils/getCalendar";
import { appStoreMetadata } from "@calcom/app-store/appStoreMetadata";
import { log } from "@calcom/lib/logger";
import type { NewCalendarEventType } from "@calcom/types/Calendar";

interface CreateEventMethodMockCall {
  args: {
    calEvent: any;
    credentialId: any;
    externalCalendarId: any;
  };
  calendarServiceConstructorArgs: {
    credential: any;
  };
}

interface UpdateEventMethodMockCall {
  args: {
    uid: any;
    calEvent: any;
    externalCalendarId: any;
  };
  calendarServiceConstructorArgs: {
    credential: any;
  };
}

interface DeleteEventMethodMockCall {
  args: {
    uid: any;
    event: any;
    externalCalendarId: any;
  };
  calendarServiceConstructorArgs: {
    credential: any;
  };
}

interface GetAvailabilityMethodMockCall {
  args: {
    dateFrom: any;
    dateTo: any;
    selectedCalendars: any;
  };
  calendarServiceConstructorArgs: {
    credential: any;
  };
}

interface CalendarServiceMethodMock {
  createEventCalls: CreateEventMethodMockCall[];
  updateEventCalls: UpdateEventMethodMockCall[];
  deleteEventCalls: DeleteEventMethodMockCall[];
  getAvailabilityCalls: GetAvailabilityMethodMockCall[];
}

export function mockCalendar(
  metadataLookupKey: keyof typeof appStoreMetadata,
  calendarData?: {
    create?: {
      id?: string;
      uid?: string;
      iCalUID?: string;
      appSpecificData?: {
        googleCalendar?: {
          hangoutLink?: string;
        };
        office365Calendar?: {
          url?: string;
        };
      };
    };
    update?: {
      id?: string;
      uid: string;
      iCalUID?: string;
      appSpecificData?: {
        googleCalendar?: {
          hangoutLink?: string;
        };
        office365Calendar?: {
          url?: string;
        };
      };
    };
    busySlots?: { start: `${string}Z`; end: `${string}Z` }[];
    creationCrash?: boolean;
    updationCrash?: boolean;
    getAvailabilityCrash?: boolean;
    credential?: CredentialForCalendarService;
  }
): CalendarServiceMethodMock {
  const appStoreLookupKey = metadataLookupKey;
  const normalizedCalendarData = calendarData || {
    create: {
      uid: "MOCK_ID",
    },
    update: {
      uid: "UPDATED_MOCK_ID",
    },
  };
  log.silly(`Mocking ${appStoreLookupKey} on calendarServicesMapMock`);

  const createEventCalls: CreateEventMethodMockCall[] = [];
  const updateEventCalls: UpdateEventMethodMockCall[] = [];
  const deleteEventCalls: DeleteEventMethodMockCall[] = [];
  const getAvailabilityCalls: GetAvailabilityMethodMockCall[] = [];
  const app = appStoreMetadata[metadataLookupKey as keyof typeof appStoreMetadata];
  const credential = calendarData?.credential || {
    id: 1,
    type: "oauth",
    key: "MOCK_CREDENTIAL",
    userId: 1,
    teamId: null,
    appId: app.slug,
    user: {
      email: "MOCK_USER_EMAIL",
    },
    invalid: false,
    delegatedTo: null,
  };

  calendarServicesMapMock[appStoreLookupKey as keyof typeof calendarServicesMapMock] = {
    lib: {
      CalendarService: (credential) => {
        return {
          createEvent: async function (...rest: any[]): Promise<NewCalendarEventType> {
            if (calendarData?.creationCrash) {
              throw new Error("MockCalendarService.createEvent fake error");
            }
            const [calEvent, credentialId, externalCalendarId] = rest;
            log.debug(
              "mockCalendar.createEvent",
              JSON.stringify({ calEvent, credentialId, externalCalendarId })
            );
            createEventCalls.push({
              args: {
                calEvent,
                credentialId,
                externalCalendarId,
              },
              calendarServiceConstructorArgs: {
                credential,
              },
            });
            const isGoogleMeetLocation = calEvent?.location === BookingLocations.GoogleMeet;
            return Promise.resolve({
              type: app.type,
              additionalInfo: {},
              uid: "PROBABLY_UNUSED_UID",
              hangoutLink:
                (isGoogleMeetLocation
                  ? normalizedCalendarData.create?.appSpecificData?.googleCalendar?.hangoutLink
                  : undefined) || "",
              ...(normalizedCalendarData.create || {}),
            });
          },
          updateEvent: async function (...rest: any[]): Promise<NewCalendarEventType> {
            if (calendarData?.updationCrash) {
              throw new Error("MockCalendarService.updateEvent fake error");
            }
            const [uid, calEvent, externalCalendarId] = rest;
            log.debug("mockCalendar.updateEvent", JSON.stringify({ uid, calEvent, externalCalendarId }));
            updateEventCalls.push({
              args: {
                uid,
                calEvent,
                externalCalendarId,
              },
              calendarServiceConstructorArgs: {
                credential,
              },
            });
            return Promise.resolve({
              type: app.type,
              additionalInfo: {},
              uid: "PROBABLY_UNUSED_UID",
              ...(normalizedCalendarData.update || {}),
            });
          },
          deleteEvent: async function (...rest: any[]): Promise<void> {
            const [uid, event, externalCalendarId] = rest;
            log.debug("mockCalendar.deleteEvent", JSON.stringify({ uid, event, externalCalendarId }));
            deleteEventCalls.push({
              args: {
                uid,
                event,
                externalCalendarId,
              },
              calendarServiceConstructorArgs: {
                credential,
              },
            });
            return Promise.resolve();
          },
          getAvailability: async function (...rest: any[]): Promise<{
            busy: { start: string; end: string }[];
          }> {
            if (calendarData?.getAvailabilityCrash) {
              throw new Error("MockCalendarService.getAvailability fake error");
            }
            const [dateFrom, dateTo, selectedCalendars] = rest;
            log.debug(
              "mockCalendar.getAvailability",
              JSON.stringify({ dateFrom, dateTo, selectedCalendars })
            );
            getAvailabilityCalls.push({
              args: {
                dateFrom,
                dateTo,
                selectedCalendars,
              },
              calendarServiceConstructorArgs: {
                credential,
              },
            });
            return Promise.resolve({
              busy: normalizedCalendarData.busySlots || [],
            });
          },
        };
      },
    },
  };

  return {
    createEventCalls,
    deleteEventCalls,
    updateEventCalls,
    getAvailabilityCalls,
  };
}
