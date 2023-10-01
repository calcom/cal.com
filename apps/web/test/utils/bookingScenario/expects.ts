import prismaMock from "../../../../../tests/libs/__mocks__/prisma";

import type { WebhookTriggerEvents, Booking, BookingReference } from "@prisma/client";
import { expect } from "vitest";
import "vitest-fetch-mock";

import logger from "@calcom/lib/logger";
import { BookingStatus } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { Fixtures } from "@calcom/web/test/fixtures/fixtures";

import type { InputEventType } from "./bookingScenario";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toHaveEmail(expectedEmail: { htmlToContain?: string; to: string }, to: string): R;
    }
  }
}

expect.extend({
  toHaveEmail(
    emails: Fixtures["emails"],
    expectedEmail: {
      //TODO: Support email HTML parsing to target specific elements
      htmlToContain?: string;
      to: string;
    },
    to: string
  ) {
    const testEmail = emails.get().find((email) => email.to.includes(to));
    const emailsToLog = emails.get().map((email) => ({ to: email.to, html: email.html }));
    if (!testEmail) {
      logger.silly("All Emails", JSON.stringify({ numEmails: emailsToLog.length, emailsToLog }));
      return {
        pass: false,
        message: () => `No email sent to ${to}`,
      };
    }
    let isHtmlContained = true;
    let isToAddressExpected = true;
    if (expectedEmail.htmlToContain) {
      isHtmlContained = testEmail.html.includes(expectedEmail.htmlToContain);
    }
    isToAddressExpected = expectedEmail.to === testEmail.to;

    if (!isHtmlContained || !isToAddressExpected) {
      logger.silly("All Emails", JSON.stringify({ numEmails: emailsToLog.length, emailsToLog }));
    }

    return {
      pass: isHtmlContained && isToAddressExpected,
      message: () => {
        if (!isHtmlContained) {
          return `Email HTML is not as expected. Expected:"${expectedEmail.htmlToContain}" isn't contained in "${testEmail.html}"`;
        }
        return `Email To address is not as expected. Expected:${expectedEmail.to} isn't equal to ${testEmail.to}`;
      },
    };
  },
});

export function expectWebhookToHaveBeenCalledWith(
  subscriberUrl: string,
  data: {
    triggerEvent: WebhookTriggerEvents;
    payload: Record<string, unknown> | null;
  }
) {
  const fetchCalls = fetchMock.mock.calls;
  const webhooksToSubscriberUrl = fetchCalls.filter((call) => {
    return call[0] === subscriberUrl;
  });
  logger.silly("Scanning fetchCalls for webhook", fetchCalls);
  const webhookFetchCall = webhooksToSubscriberUrl.find((call) => {
    const body = call[1]?.body;
    const parsedBody = JSON.parse((body as string) || "{}");
    return parsedBody.triggerEvent === data.triggerEvent;
  });

  if (!webhookFetchCall) {
    throw new Error(
      `Webhook not sent to ${subscriberUrl} for ${data.triggerEvent}. All webhooks: ${JSON.stringify(
        webhooksToSubscriberUrl
      )}`
    );
  }
  expect(webhookFetchCall[0]).toBe(subscriberUrl);
  const body = webhookFetchCall[1]?.body;
  const parsedBody = JSON.parse((body as string) || "{}");

  expect(parsedBody.triggerEvent).toBe(data.triggerEvent);
  if (parsedBody.payload.metadata?.videoCallUrl) {
    parsedBody.payload.metadata.videoCallUrl = parsedBody.payload.metadata.videoCallUrl
      ? parsedBody.payload.metadata.videoCallUrl.replace(/\/video\/[a-zA-Z0-9]{22}/, "/video/DYNAMIC_UID")
      : parsedBody.payload.metadata.videoCallUrl;
  }
  if (data.payload) {
    if (data.payload.metadata !== undefined) {
      expect(parsedBody.payload.metadata).toEqual(expect.objectContaining(data.payload.metadata));
    }
    if (data.payload.responses !== undefined)
      expect(parsedBody.payload.responses).toEqual(expect.objectContaining(data.payload.responses));
    const { responses: _1, metadata: _2, ...remainingPayload } = data.payload;
    expect(parsedBody.payload).toEqual(expect.objectContaining(remainingPayload));
  }
}

export function expectWorkflowToBeTriggered() {
  // TODO: Implement this.
}

export async function expectBookingToBeInDatabase(
  booking: Partial<Booking> & Pick<Booking, "uid"> & { references?: Partial<BookingReference>[] }
) {
  const actualBooking = await prismaMock.booking.findUnique({
    where: {
      uid: booking.uid,
    },
    include: {
      references: true,
    },
  });

  const { references, ...remainingBooking } = booking;
  expect(actualBooking).toEqual(expect.objectContaining(remainingBooking));
  expect(actualBooking?.references).toEqual(
    expect.arrayContaining((references || []).map((reference) => expect.objectContaining(reference)))
  );
}

export function expectSuccessfulBookingCreationEmails({
  emails,
  organizer,
  booker,
}: {
  emails: Fixtures["emails"];
  organizer: { email: string; name: string };
  booker: { email: string; name: string };
}) {
  expect(emails).toHaveEmail(
    {
      htmlToContain: "<title>confirmed_event_type_subject</title>",
      to: `${organizer.email}`,
    },
    `${organizer.email}`
  );

  expect(emails).toHaveEmail(
    {
      htmlToContain: "<title>confirmed_event_type_subject</title>",
      to: `${booker.name} <${booker.email}>`,
    },
    `${booker.name} <${booker.email}>`
  );
}

export function expectBrokenIntegrationEmails({
  emails,
  organizer,
  booker,
}: {
  emails: Fixtures["emails"];
  organizer: { email: string; name: string };
  booker: { email: string; name: string };
}) {
  // Broken Integration email is only sent to the Organizer
  expect(emails).toHaveEmail(
    {
      htmlToContain: "<title>broken_integration</title>",
      to: `${organizer.email}`,
    },
    `${organizer.email}`
  );

  // expect(emails).toHaveEmail(
  //   {
  //     htmlToContain: "<title>confirmed_event_type_subject</title>",
  //     to: `${booker.name} <${booker.email}>`,
  //   },
  //   `${booker.name} <${booker.email}>`
  // );
}

export function expectCalendarEventCreationFailureEmails({
  emails,
  organizer,
  booker,
}: {
  emails: Fixtures["emails"];
  organizer: { email: string; name: string };
  booker: { email: string; name: string };
}) {
  expect(emails).toHaveEmail(
    {
      htmlToContain: "<title>broken_integration</title>",
      to: `${organizer.email}`,
    },
    `${organizer.email}`
  );

  expect(emails).toHaveEmail(
    {
      htmlToContain: "<title>calendar_event_creation_failure_subject</title>",
      to: `${booker.name} <${booker.email}>`,
    },
    `${booker.name} <${booker.email}>`
  );
}

export function expectSuccessfulBookingRescheduledEmails({
  emails,
  organizer,
  booker,
}: {
  emails: Fixtures["emails"];
  organizer: { email: string; name: string };
  booker: { email: string; name: string };
}) {
  expect(emails).toHaveEmail(
    {
      htmlToContain: "<title>event_type_has_been_rescheduled_on_time_date</title>",
      to: `${organizer.email}`,
    },
    `${organizer.email}`
  );

  expect(emails).toHaveEmail(
    {
      htmlToContain: "<title>event_type_has_been_rescheduled_on_time_date</title>",
      to: `${booker.name} <${booker.email}>`,
    },
    `${booker.name} <${booker.email}>`
  );
}
export function expectAwaitingPaymentEmails({
  emails,
  booker,
}: {
  emails: Fixtures["emails"];
  organizer: { email: string; name: string };
  booker: { email: string; name: string };
}) {
  expect(emails).toHaveEmail(
    {
      htmlToContain: "<title>awaiting_payment_subject</title>",
      to: `${booker.name} <${booker.email}>`,
    },
    `${booker.email}`
  );
}

export function expectBookingRequestedEmails({
  emails,
  organizer,
  booker,
}: {
  emails: Fixtures["emails"];
  organizer: { email: string; name: string };
  booker: { email: string; name: string };
}) {
  expect(emails).toHaveEmail(
    {
      htmlToContain: "<title>event_awaiting_approval_subject</title>",
      to: `${organizer.email}`,
    },
    `${organizer.email}`
  );

  expect(emails).toHaveEmail(
    {
      htmlToContain: "<title>booking_submitted_subject</title>",
      to: `${booker.email}`,
    },
    `${booker.email}`
  );
}

export function expectBookingRequestedWebhookToHaveBeenFired({
  booker,
  location,
  subscriberUrl,
  paidEvent,
  eventType,
}: {
  organizer: { email: string; name: string };
  booker: { email: string; name: string };
  subscriberUrl: string;
  location: string;
  paidEvent?: boolean;
  eventType: InputEventType;
}) {
  // There is an inconsistency in the way we send the data to the webhook for paid events and unpaid events. Fix that and then remove this if statement.
  if (!paidEvent) {
    expectWebhookToHaveBeenCalledWith(subscriberUrl, {
      triggerEvent: "BOOKING_REQUESTED",
      payload: {
        eventTitle: eventType.title,
        eventDescription: eventType.description,
        metadata: {
          // In a Pending Booking Request, we don't send the video call url
        },
        responses: {
          name: { label: "your_name", value: booker.name },
          email: { label: "email_address", value: booker.email },
          location: {
            label: "location",
            value: { optionValue: "", value: location },
          },
        },
      },
    });
  } else {
    expectWebhookToHaveBeenCalledWith(subscriberUrl, {
      triggerEvent: "BOOKING_REQUESTED",
      payload: {
        eventTitle: eventType.title,
        eventDescription: eventType.description,
        metadata: {
          // In a Pending Booking Request, we don't send the video call url
        },
        responses: {
          name: { label: "name", value: booker.name },
          email: { label: "email", value: booker.email },
          location: {
            label: "location",
            value: { optionValue: "", value: location },
          },
        },
      },
    });
  }
}

export function expectBookingCreatedWebhookToHaveBeenFired({
  booker,
  location,
  subscriberUrl,
  paidEvent,
  videoCallUrl,
}: {
  organizer: { email: string; name: string };
  booker: { email: string; name: string };
  subscriberUrl: string;
  location: string;
  paidEvent?: boolean;
  videoCallUrl?: string;
}) {
  if (!paidEvent) {
    expectWebhookToHaveBeenCalledWith(subscriberUrl, {
      triggerEvent: "BOOKING_CREATED",
      payload: {
        metadata: {
          ...(videoCallUrl ? { videoCallUrl } : null),
        },
        responses: {
          name: { label: "your_name", value: booker.name },
          email: { label: "email_address", value: booker.email },
          location: {
            label: "location",
            value: { optionValue: "", value: location },
          },
        },
      },
    });
  } else {
    expectWebhookToHaveBeenCalledWith(subscriberUrl, {
      triggerEvent: "BOOKING_CREATED",
      payload: {
        // FIXME: File this bug and link ticket here. This is a bug in the code. metadata must be sent here like other BOOKING_CREATED webhook
        metadata: null,
        responses: {
          name: { label: "name", value: booker.name },
          email: { label: "email", value: booker.email },
          location: {
            label: "location",
            value: { optionValue: "", value: location },
          },
        },
      },
    });
  }
}

export function expectBookingRescheduledWebhookToHaveBeenFired({
  booker,
  location,
  subscriberUrl,
  videoCallUrl,
}: {
  organizer: { email: string; name: string };
  booker: { email: string; name: string };
  subscriberUrl: string;
  location: string;
  paidEvent?: boolean;
  videoCallUrl?: string;
}) {
  expectWebhookToHaveBeenCalledWith(subscriberUrl, {
    triggerEvent: "BOOKING_RESCHEDULED",
    payload: {
      metadata: {
        ...(videoCallUrl ? { videoCallUrl } : null),
      },
      responses: {
        name: { label: "your_name", value: booker.name },
        email: { label: "email_address", value: booker.email },
        location: {
          label: "location",
          value: { optionValue: "", value: location },
        },
      },
    },
  });
}

export function expectBookingPaymentIntiatedWebhookToHaveBeenFired({
  booker,
  location,
  subscriberUrl,
  paymentId,
}: {
  organizer: { email: string; name: string };
  booker: { email: string; name: string };
  subscriberUrl: string;
  location: string;
  paymentId: number;
}) {
  expectWebhookToHaveBeenCalledWith(subscriberUrl, {
    triggerEvent: "BOOKING_PAYMENT_INITIATED",
    payload: {
      paymentId: paymentId,
      metadata: {
        // In a Pending Booking Request, we don't send the video call url
      },
      responses: {
        name: { label: "your_name", value: booker.name },
        email: { label: "email_address", value: booker.email },
        location: {
          label: "location",
          value: { optionValue: "", value: location },
        },
      },
    },
  });
}

export function expectSuccessfulCalendarEventCreationInCalendar(
  calendarMock: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createEventCalls: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateEventCalls: any[];
  },
  expected: {
    calendarId: string | null;
    videoCallUrl: string;
  }
) {
  expect(calendarMock.createEventCalls.length).toBe(1);
  const call = calendarMock.createEventCalls[0];
  const calEvent = call[0];

  expect(calEvent).toEqual(
    expect.objectContaining({
      destinationCalendar: expected.calendarId
        ? [
            expect.objectContaining({
              externalId: expected.calendarId,
            }),
          ]
        : null,
      videoCallData: expect.objectContaining({
        url: expected.videoCallUrl,
      }),
    })
  );
}

export function expectSuccessfulCalendarEventUpdationInCalendar(
  calendarMock: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createEventCalls: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateEventCalls: any[];
  },
  expected: {
    externalCalendarId: string;
    calEvent: Partial<CalendarEvent>;
    uid: string;
  }
) {
  expect(calendarMock.updateEventCalls.length).toBe(1);
  const call = calendarMock.updateEventCalls[0];
  const uid = call[0];
  const calendarEvent = call[1];
  const externalId = call[2];
  expect(uid).toBe(expected.uid);
  expect(calendarEvent).toEqual(expect.objectContaining(expected.calEvent));
  expect(externalId).toBe(expected.externalCalendarId);
}

export function expectSuccessfulVideoMeetingCreationInCalendar(
  videoMock: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createMeetingCalls: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateMeetingCalls: any[];
  },
  expected: {
    externalCalendarId: string;
    calEvent: Partial<CalendarEvent>;
    uid: string;
  }
) {
  expect(videoMock.createMeetingCalls.length).toBe(1);
  const call = videoMock.createMeetingCalls[0];
  const uid = call[0];
  const calendarEvent = call[1];
  const externalId = call[2];
  expect(uid).toBe(expected.uid);
  expect(calendarEvent).toEqual(expect.objectContaining(expected.calEvent));
  expect(externalId).toBe(expected.externalCalendarId);
}

export function expectSuccessfulVideoMeetingUpdationInCalendar(
  videoMock: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createMeetingCalls: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateMeetingCalls: any[];
  },
  expected: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bookingRef: any;
    calEvent: Partial<CalendarEvent>;
  }
) {
  expect(videoMock.updateMeetingCalls.length).toBe(1);
  const call = videoMock.updateMeetingCalls[0];
  const bookingRef = call[0];
  const calendarEvent = call[1];
  expect(bookingRef).toEqual(expect.objectContaining(expected.bookingRef));
  expect(calendarEvent).toEqual(expect.objectContaining(expected.calEvent));
}

export async function expectBookingInDBToBeRescheduledFromTo({ from, to }: { from: any; to: any }) {
  // Expect previous booking to be cancelled
  await expectBookingToBeInDatabase({
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    ...from,
    status: BookingStatus.CANCELLED,
  });

  // Expect new booking to be created
  await expectBookingToBeInDatabase({
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    ...to,
    status: BookingStatus.ACCEPTED,
  });
}
