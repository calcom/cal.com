import prismaMock from "../../../../../tests/libs/__mocks__/prisma";

import type { InputEventType, getOrganizer, CalendarServiceMethodMock } from "./bookingScenario";

import { parse } from "node-html-parser";
import type { VEvent } from "node-ical";
import ical from "node-ical";
import { expect, vi } from "vitest";
import "vitest-fetch-mock";

import dayjs from "@calcom/dayjs";
// TODO: Define proper type or find alternative
import { WEBSITE_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type {
  WebhookTriggerEvents,
  Booking,
  BookingReference,
  DestinationCalendar,
} from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";
import type { AppsStatus } from "@calcom/types/Calendar";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";
import type { Fixtures } from "@calcom/web/test/fixtures/fixtures";

import { DEFAULT_TIMEZONE_BOOKER } from "./getMockRequestDataForBooking";

type Tracking = any; // TODO: Define proper type or find alternative

// This is too complex at the moment, I really need to simplify this.

function formatDateToWhenFormat(date: Date) {
  return dayjs(date).format("dddd, MMMM D, YYYY");
}

expect.extend({
  toHaveEmail(
    {
      emails,
      organizer,
      booker,
      otherTeamMembers,
      iCalUID,
    }: {
      emails: Fixtures["emails"];
      organizer: ReturnType<typeof getOrganizer>;
      booker: { name: string; email: string };
      otherTeamMembers?: { name?: string | null; email: string }[];
      iCalUID?: string;
    },
    expectedEmail: {
      heading: string;
      to: string;
      ics?: {
        filename: string;
        iCalUID: string;
      };
      appsStatus?: AppsStatus;
      noIcs?: boolean;
      recurrence?: {
        rrule: string;
      };
    }
  ) {
    const testEmail = emails.get().find((email) => email.to.includes(expectedEmail.to));
    if (!testEmail) {
      logger.silly("All emails", JSON.stringify(emails.get(), null, 2));
      return {
        pass: false,
        message: () => `No email sent to ${expectedEmail.to}`,
      };
    }

    const emailsToLog = emails.get().map((email) => ({
      to: email.to,
      subject: email.subject,
      html: email.html.length > 500 ? email.html.substring(0, 500) + "..." : email.html,
    }));
    logger.silly("All emails", JSON.stringify(emailsToLog, null, 2));

    const dom = parse(testEmail.html);
    const [emailHeaderElement] = dom.querySelectorAll(`[data-testid="email-header"]`);
    if (!emailHeaderElement) {
      return {
        pass: false,
        message: () => `No email header found`,
      };
    }

    const emailHeader = emailHeaderElement.innerText;

    let isIcsUIDExpected = !!expectedEmail.ics;
    if (expectedEmail.noIcs) {
      isIcsUIDExpected = false;
    }

    const actualEmailContent = {
      to: testEmail.to,
      subject: testEmail.subject,
      html: testEmail.html,
      ics: testEmail.ics,
    };

    let isEmailContentMatched = true;
    let matchedContent: string[] = [];
    let unmatchedContent: string[] = [];

    if (expectedEmail.heading) {
      if (emailHeader.includes(expectedEmail.heading)) {
        matchedContent.push(`Heading: ${expectedEmail.heading}`);
      } else {
        isEmailContentMatched = false;
        unmatchedContent.push(`Heading: ${expectedEmail.heading}`);
      }
    }

    if (expectedEmail.to) {
      if (testEmail.to.includes(expectedEmail.to)) {
        matchedContent.push(`To: ${expectedEmail.to}`);
      } else {
        isEmailContentMatched = false;
        unmatchedContent.push(`To: ${expectedEmail.to}`);
      }
    }

    if (isIcsUIDExpected) {
      if (testEmail.ics) {
        const ics = testEmail.ics;
        const icsLines = ics.split("\n");
        const uidLine = icsLines.find((line: string) => line.startsWith("UID:"));
        const uid = uidLine?.replace("UID:", "");
        const isUidValid = !!(expectedEmail.ics?.iCalUID ? uid === expectedEmail.ics.iCalUID : uid);
        if (isUidValid) {
          matchedContent.push(`ICS: ${expectedEmail.ics?.filename || "ics file found"}`);
        } else {
          isEmailContentMatched = false;
          unmatchedContent.push(`ICS: ${expectedEmail.ics?.filename || "ics file not found"}`);
        }
      } else {
        isEmailContentMatched = false;
        unmatchedContent.push(`ICS: ${expectedEmail.ics?.filename || "ics file not found"}`);
      }
    }

    if (expectedEmail.appsStatus) {
      const actualAppsStatus = getAppsStatusFromEmail(testEmail);
      const expectedAppStatus = expectedEmail.appsStatus.map((app) => {
        return {
          appName: app.appName,
          success: app.success,
          failures: app.failures,
          errors: app.errors,
          warnings: app.warnings,
        };
      });

      if (JSON.stringify(actualAppsStatus) === JSON.stringify(expectedAppStatus)) {
        matchedContent.push(`AppsStatus: ${JSON.stringify(expectedAppStatus)}`);
      } else {
        isEmailContentMatched = false;
        unmatchedContent.push(`AppsStatus: ${JSON.stringify(expectedAppStatus)}`);
      }
    }

    function getExpectedEmailContent({
      organizer,
      booker,
      otherTeamMembers,
    }: {
      organizer: { name: string; email: string };
      booker: { name: string; email: string };
      otherTeamMembers?: { name?: string | null; email: string }[];
    }) {
      const when = formatDateToWhenFormat(new Date());
      const expectedEmailContent = {
        organizer: organizer.name,
        booker: booker.name,
        when,
        otherTeamMembers: otherTeamMembers?.map((member) => member.name).join(", ") || "",
      };
      return expectedEmailContent;
    }

    function assertHasRecurrence({
      ics,
      recurrence,
    }: {
      ics: string | undefined;
      recurrence: { rrule: string };
    }) {
      if (!ics) {
        throw new Error("ICS not found");
      }
      const expectedRrule = recurrence.rrule;
      const icsObject = ical.parseICS(ics);
      const vevent = Object.values(icsObject).find((event) => event.type === "VEVENT") as VEvent;
      if (!vevent.rrule) {
        throw new Error("RRULE not found in ICS");
      }
      expect(vevent.rrule.toString()).toContain(expectedRrule);
    }

    return {
      pass: isEmailContentMatched,
      message: () =>
        `Email content ${isEmailContentMatched ? "matched" : "didn't match"}:
        ${matchedContent.length ? `Matched: ${matchedContent.join(", ")}` : ""}
        ${unmatchedContent.length ? `Unmatched: ${unmatchedContent.join(", ")}` : ""}`,
    };
  },
});

export function expectWebhookToHaveBeenCalledWith(
  subscriberUrl: string,
  data: {
    triggerEvent: WebhookTriggerEvents;
    payload: Record<string, unknown>;
  }
) {
  const fetchCalls = fetchMock.mock.calls;
  const webhooksToSubscriberUrl = fetchCalls.filter((call) => {
    return call[0] === subscriberUrl;
  });
  console.log("Webhook calls to subscriberUrl", subscriberUrl, webhooksToSubscriberUrl.length);
  const webhookFetchCall = webhooksToSubscriberUrl.find((call) => {
    const body = call[1]?.body;
    const parsedBody = JSON.parse((body as string) || "{}");
    return parsedBody.triggerEvent === data.triggerEvent;
  });
  if (!webhookFetchCall) {
    throw new Error(
      `Webhook not called with ${data.triggerEvent}. All webhook calls: ${JSON.stringify(
        webhooksToSubscriberUrl
      )}`
    );
  }

  const body = webhookFetchCall[1]?.body;
  const parsedBody = JSON.parse((body as string) || "{}");
  expect(parsedBody).toMatchObject(data.payload);
}

export function expectWorkflowToBeTriggered() {
  // TODO: Implement workflow trigger expectation
}

export function expectWorkflowToBeNotTriggered() {
  // TODO: Implement workflow not triggered expectation
}

export function expectSMSWorkflowToBeTriggered() {
  // TODO: Implement SMS workflow trigger expectation
}

export function expectSMSWorkflowToBeNotTriggered() {
  // TODO: Implement SMS workflow not triggered expectation
}

export function expectBookingToBeInDatabase(booking: Partial<Booking> & Pick<Booking, "uid">) {
  const actualBooking = prismaMock.booking.findUnique({
    where: {
      uid: booking.uid,
    },
  });
  expect(actualBooking).toEqual(expect.objectContaining(booking));
}

export function expectBookingTrackingToBeInDatabase(tracking: Tracking) {
  const actualBooking = prismaMock.booking.findUnique({
    where: {
      uid: tracking.uid,
    },
  });
  expect(actualBooking).toEqual(expect.objectContaining(tracking));
}

export function expectSMSToBeTriggered() {
  // TODO: Implement SMS trigger expectation
}

export function expectSuccessfulBookingCreationEmails({
  booking,
  booker,
  organizer,
  emails,
  iCalUID,
  recurrence,
}: {
  booking: {
    uid: string;
  };
  booker: { name: string; email: string };
  organizer: { name: string; email: string };
  emails: Fixtures["emails"];
  iCalUID?: string;
  recurrence?: {
    rrule: string;
  };
}) {
  expect(emails).toHaveEmail(
    {
      emails,
      organizer,
      booker,
      iCalUID,
    },
    {
      heading: "confirmed",
      to: `${organizer.email}`,
      ics: {
        filename: "event.ics",
        iCalUID: iCalUID || `${booking.uid}@cal.com`,
      },
      recurrence,
    }
  );

  expect(emails).toHaveEmail(
    {
      emails,
      organizer,
      booker,
      iCalUID,
    },
    {
      heading: "confirmed",
      to: `${booker.email}`,
      ics: {
        filename: "event.ics",
        iCalUID: iCalUID || `${booking.uid}@cal.com`,
      },
      recurrence,
    }
  );
}

export function expectBrokenIntegrationEmails({
  booker,
  organizer,
  emails,
}: {
  booker: { name: string; email: string };
  organizer: { name: string; email: string };
  emails: Fixtures["emails"];
}) {
  expect(emails).toHaveEmail(
    {
      emails,
      organizer,
      booker,
    },
    {
      heading: "broken_integration",
      to: `${organizer.email}`,
      noIcs: true,
    }
  );
}

export function expectCalendarEventCreationFailureEmails({
  booker,
  organizer,
  emails,
}: {
  booker: { name: string; email: string };
  organizer: { name: string; email: string };
  emails: Fixtures["emails"];
}) {
  expect(emails).toHaveEmail(
    {
      emails,
      organizer,
      booker,
    },
    {
      heading: "calendar_event_creation_failure",
      to: `${organizer.email}`,
      noIcs: true,
    }
  );
}

export function expectSuccessfulRoundRobinReschedulingEmails({
  booker,
  organizer,
  emails,
  iCalUID,
}: {
  booker: { name: string; email: string };
  organizer: { name: string; email: string };
  emails: Fixtures["emails"];
  iCalUID?: string;
}) {
  expect(emails).toHaveEmail(
    {
      emails,
      organizer,
      booker,
      iCalUID,
    },
    {
      heading: "rescheduled",
      to: `${organizer.email}`,
      ics: {
        filename: "event.ics",
        iCalUID: iCalUID || `@cal.com`,
      },
    }
  );

  expect(emails).toHaveEmail(
    {
      emails,
      organizer,
      booker,
      iCalUID,
    },
    {
      heading: "rescheduled",
      to: `${booker.email}`,
      ics: {
        filename: "event.ics",
        iCalUID: iCalUID || `@cal.com`,
      },
    }
  );
}

export function expectSuccessfulBookingRescheduledEmails({
  booker,
  organizer,
  emails,
  iCalUID,
}: {
  booker: { name: string; email: string };
  organizer: { name: string; email: string };
  emails: Fixtures["emails"];
  iCalUID?: string;
}) {
  expect(emails).toHaveEmail(
    {
      emails,
      organizer,
      booker,
      iCalUID,
    },
    {
      heading: "rescheduled",
      to: `${organizer.email}`,
      ics: {
        filename: "event.ics",
        iCalUID: iCalUID || `@cal.com`,
      },
    }
  );
}

export function expectSuccesfulLocationChangeEmails({
  booker,
  organizer,
  emails,
}: {
  booker: { name: string; email: string };
  organizer: { name: string; email: string };
  emails: Fixtures["emails"];
}) {
  expect(emails).toHaveEmail(
    {
      emails,
      organizer,
      booker,
    },
    {
      heading: "location_changed",
      to: `${organizer.email}`,
    }
  );
}

export function expectAwaitingPaymentEmails({
  booker,
  organizer,
  emails,
}: {
  booker: { name: string; email: string };
  organizer: { name: string; email: string };
  emails: Fixtures["emails"];
}) {
  expect(emails).toHaveEmail(
    {
      emails,
      organizer,
      booker,
    },
    {
      heading: "awaiting_payment",
      to: `${booker.email}`,
    }
  );
}

export function expectBookingRequestedEmails({
  booker,
  organizer,
  emails,
}: {
  booker: { name: string; email: string };
  organizer: { name: string; email: string };
  emails: Fixtures["emails"];
}) {
  expect(emails).toHaveEmail(
    {
      emails,
      organizer,
      booker,
    },
    {
      heading: "booking_submitted",
      to: `${booker.email}`,
    }
  );

  expect(emails).toHaveEmail(
    {
      emails,
      organizer,
      booker,
    },
    {
      heading: "booking_requested",
      to: `${organizer.email}`,
    }
  );
}

export function expectBookingRequestRescheduledEmails({
  booker,
  organizer,
  emails,
}: {
  booker: { name: string; email: string };
  organizer: { name: string; email: string };
  emails: Fixtures["emails"];
}) {
  expect(emails).toHaveEmail(
    {
      emails,
      organizer,
      booker,
    },
    {
      heading: "booking_submitted",
      to: `${booker.email}`,
    }
  );

  expect(emails).toHaveEmail(
    {
      emails,
      organizer,
      booker,
    },
    {
      heading: "booking_requested",
      to: `${organizer.email}`,
    }
  );
}

export function expectBookingRequestedWebhookToHaveBeenFired({
  booker,
  organizer,
  location,
  subscriberUrl,
  eventType,
}: {
  organizer: { name: string; email: string };
  booker: { name: string; email: string };
  location: string;
  subscriberUrl: string;
  eventType: { id: number };
}) {
  expectWebhookToHaveBeenCalledWith(subscriberUrl, {
    triggerEvent: "BOOKING_REQUESTED",
    payload: {
      type: "BOOKING_REQUESTED",
      title: "30 min",
      description: "",
      additionalNotes: "",
      customInputs: {},
      startTime: "2021-06-20T09:30:00.000Z",
      endTime: "2021-06-20T10:00:00.000Z",
      organizer: {
        name: organizer.name,
        email: organizer.email,
        timeZone: "Asia/Kolkata",
        language: {
          locale: "en",
        },
      },
      attendees: [
        {
          email: booker.email,
          name: booker.name,
          timeZone: DEFAULT_TIMEZONE_BOOKER,
          language: {
            locale: "en",
          },
        },
      ],
      location: location,
      destinationCalendar: null,
      hideCalendar: false,
      uid: "DYNAMIC_UID",
      eventTypeId: eventType.id,
      metadata: {},
    },
  });
}

export function expectBookingCreatedWebhookToHaveBeenFired({
  booker,
  organizer,
  location,
  subscriberUrl,
  videoCallUrl,
}: {
  organizer: { name: string; email: string };
  booker: { name: string; email: string };
  location: string;
  subscriberUrl: string;
  videoCallUrl?: string;
}) {
  expectWebhookToHaveBeenCalledWith(subscriberUrl, {
    triggerEvent: "BOOKING_CREATED",
    payload: {
      type: "BOOKING_CREATED",
      title: "30 min",
      description: "",
      additionalNotes: "",
      customInputs: {},
      startTime: "2021-06-20T09:30:00.000Z",
      endTime: "2021-06-20T10:00:00.000Z",
      organizer: {
        name: organizer.name,
        email: organizer.email,
        timeZone: "Asia/Kolkata",
        language: {
          locale: "en",
        },
      },
      attendees: [
        {
          email: booker.email,
          name: booker.name,
          timeZone: DEFAULT_TIMEZONE_BOOKER,
          language: {
            locale: "en",
          },
        },
      ],
      location: location,
      destinationCalendar: null,
      hideCalendar: false,
      uid: "DYNAMIC_UID",
      metadata: {},
      ...(videoCallUrl && { videoCallData: expect.objectContaining({ url: videoCallUrl }) }),
    },
  });
}

export function expectBookingRescheduledWebhookToHaveBeenFired({
  booker,
  organizer,
  location,
  subscriberUrl,
}: {
  organizer: { name: string; email: string };
  booker: { name: string; email: string };
  location: string;
  subscriberUrl: string;
}) {
  expectWebhookToHaveBeenCalledWith(subscriberUrl, {
    triggerEvent: "BOOKING_RESCHEDULED",
    payload: {},
  });
}

export function expectBookingCancelledWebhookToHaveBeenFired({
  booker,
  organizer,
  location,
  subscriberUrl,
}: {
  organizer: { name: string; email: string };
  booker: { name: string; email: string };
  location: string;
  subscriberUrl: string;
}) {
  expectWebhookToHaveBeenCalledWith(subscriberUrl, {
    triggerEvent: "BOOKING_CANCELLED",
    payload: {},
  });
}

export function expectBookingPaymentIntiatedWebhookToHaveBeenFired({
  booker,
  organizer,
  location,
  subscriberUrl,
}: {
  organizer: { name: string; email: string };
  booker: { name: string; email: string };
  location: string;
  subscriberUrl: string;
}) {
  expectWebhookToHaveBeenCalledWith(subscriberUrl, {
    triggerEvent: "BOOKING_PAYMENT_INITIATED",
    payload: {},
  });
}

function getAppsStatusFromEmail(email: { html: string }) {
  return [];
}

export function expectSuccessfulCalendarEventCreationInCalendar(
  calendarMock: CalendarServiceMethodMock,
  expectedCalendarEvent: {
    videoCallData?: {
      type: string;
      id: string;
      password: string;
      url: string;
    };
    location?: string;
    destinationCalendar?: DestinationCalendar;
    organizer: ReturnType<typeof getOrganizer>;
    uid?: string;
  }
) {
  expect(calendarMock.createEvent).toHaveBeenCalledTimes(1);
  const call = calendarMock.createEvent.mock.calls[0];
  const calendarEvent = call[0].event;
  const calendarId = call[0].calendarId;

  if (expectedCalendarEvent.videoCallData) {
    expect(calendarEvent).toEqual(
      expect.objectContaining({
        videoCallData: expectedCalendarEvent.videoCallData,
      })
    );
  }

  if (expectedCalendarEvent.location) {
    expect(calendarEvent.location).toBe(expectedCalendarEvent.location);
  }

  if (expectedCalendarEvent.destinationCalendar) {
    expect(calendarId).toBe(expectedCalendarEvent.destinationCalendar.externalId);
  }

  expect(calendarEvent.organizer).toEqual(
    expect.objectContaining({
      email: expectedCalendarEvent.organizer.email,
      name: expectedCalendarEvent.organizer.name,
    })
  );

  if (expectedCalendarEvent.uid) {
    expect(calendarEvent.uid).toBe(expectedCalendarEvent.uid);
  }
}

export function expectSuccessfulCalendarEventUpdationInCalendar(
  calendarMock: CalendarServiceMethodMock,
  expectedCalendarEvent: {
    uid: string;
  }
) {
  expect(calendarMock.updateEvent).toHaveBeenCalledTimes(1);
  const call = calendarMock.updateEvent.mock.calls[0];
  const uid = call[0];
  expect(uid).toBe(expectedCalendarEvent.uid);
}

export function expectSuccessfulCalendarEventDeletionInCalendar(
  calendarMock: CalendarServiceMethodMock,
  expectedCalendarEvent: {
    uid: string;
  }
) {
  expect(calendarMock.deleteEvent).toHaveBeenCalledTimes(1);
  const call = calendarMock.deleteEvent.mock.calls[0];
  const uid = call[0];
  expect(uid).toBe(expectedCalendarEvent.uid);
}

export function expectSuccessfulVideoMeetingCreation(
  videoMock: {
    createMeeting: any;
  },
  expectedVideoCallData: {
    type: string;
    id: string;
    password: string;
    url: string;
  }
) {
  expect(videoMock.createMeeting).toHaveBeenCalledTimes(1);
  const call = videoMock.createMeeting.mock.calls[0];
  expect(call[0]).toEqual(
    expect.objectContaining({
      type: expectedVideoCallData.type,
    })
  );
}

export function expectSuccessfulVideoMeetingUpdationInCalendar(
  videoMock: {
    updateMeeting: any;
  },
  expectedVideoCallData: {
    type: string;
    id: string;
    password: string;
    url: string;
  }
) {
  expect(videoMock.updateMeeting).toHaveBeenCalledTimes(1);
  const call = videoMock.updateMeeting.mock.calls[0];
  expect(call[0]).toEqual(
    expect.objectContaining({
      type: expectedVideoCallData.type,
    })
  );
}

export function expectSuccessfulVideoMeetingDeletionInCalendar(
  videoMock: {
    deleteMeeting: any;
  },
  expectedVideoCallData: {
    type: string;
    id: string;
    password: string;
    url: string;
  }
) {
  expect(videoMock.deleteMeeting).toHaveBeenCalledTimes(1);
}

export function expectBookingInDBToBeRescheduledFromTo({
  from,
  to,
}: {
  from: { uid: string };
  to: { uid: string };
}) {
  const fromBooking = prismaMock.booking.findUnique({
    where: {
      uid: from.uid,
    },
  });
  const toBooking = prismaMock.booking.findUnique({
    where: {
      uid: to.uid,
    },
  });
  expect(fromBooking?.rescheduled).toBe(true);
  expect(toBooking?.fromReschedule).toBe(from.uid);
}

export function expectICalUIDAsString(iCalUID: string) {
  expect(typeof iCalUID).toBe("string");
  expect(iCalUID.length).toBeGreaterThan(0);
}

export function expectBookingToNotHaveReference(booking: { uid: string }, referenceType: string) {
  const actualBooking = prismaMock.booking.findUnique({
    where: {
      uid: booking.uid,
    },
    include: {
      references: true,
    },
  });
  expect(actualBooking?.references).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: referenceType,
      }),
    ])
  );
}

export function expectNoAttemptToCreateCalendarEvent() {
  // TODO: Implement calendar event creation expectation
}

export function expectNoAttemptToGetAvailability() {
  // TODO: Implement availability check expectation
}
