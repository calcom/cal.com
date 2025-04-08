import type { appStoreMetadata } from "@calcom/app-store/apps.metadata.generated";
import logger from "@calcom/lib/logger";
import type { CredentialPayload } from "@calcom/types/Credential";

import { createMockCalendarService } from "./mockAppStore";

const log = logger.getSubLogger({ prefix: ["[bookingScenario]"] });

export interface CalendarServiceMethodMockCallBase {
  calendarServiceConstructorArgs: {
    credential: any;
  };
}

export interface CreateEventMethodMockCall extends CalendarServiceMethodMockCallBase {
  args: {
    calEvent: any;
    credentialId: any;
    externalCalendarId: any;
  };
}

export interface UpdateEventMethodMockCall extends CalendarServiceMethodMockCallBase {
  args: {
    uid: any;
    calEvent: any;
    externalCalendarId: any;
  };
}

export interface DeleteEventMethodMockCall extends CalendarServiceMethodMockCallBase {
  args: {
    uid: any;
    calEvent: any;
    externalCalendarId: any;
  };
}

export interface GetAvailabilityMethodMockCall extends CalendarServiceMethodMockCallBase {
  args: {
    dateFrom: any;
    dateTo: any;
    selectedCalendars: any;
  };
}

export interface CalendarServiceMethodMock {
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
    credential?: CredentialPayload;
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

  createMockCalendarService(appStoreLookupKey, normalizedCalendarData);

  return {
    createEventCalls: [],
    deleteEventCalls: [],
    updateEventCalls: [],
    getAvailabilityCalls: [],
  };
}
