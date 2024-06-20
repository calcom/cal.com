import prismaMock from "../../../../../tests/libs/__mocks__/prisma";

import type { InputEventType, getOrganizer } from "./bookingScenario";

import type { WebhookTriggerEvents, Booking, BookingReference, DestinationCalendar } from "@prisma/client";
import { parse } from "node-html-parser";
import type { VEvent } from "node-ical";
import ical from "node-ical";
import { expect, vi } from "vitest";
import "vitest-fetch-mock";

import dayjs from "@calcom/dayjs";
import { WEBSITE_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { BookingStatus } from "@calcom/prisma/enums";
import type { AppsStatus } from "@calcom/types/Calendar";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { Fixtures } from "@calcom/web/test/fixtures/fixtures";

import { DEFAULT_TIMEZONE_BOOKER } from "./getMockRequestDataForBooking";

// This is too complex at the moment, I really need to simplify this.
// Maybe we can replace the exact match with a partial match approach that would be easier to maintain but we would still need Dayjs to do the timezone conversion
// Alternative could be that we use some other library to do the timezone conversion?
function formatDateToWhenFormat({ start, end }: { start: Date; end: Date }, timeZone: string) {
  const startTime = dayjs(start).tz(timeZone);
  return `${startTime.format(`dddd, LL`)} | ${startTime.format("h:mma")} - ${dayjs(end)
    .tz(timeZone)
    .format("h:mma")} (${timeZone})`;
}

type Recurrence = {
  freq: number;
  interval: number;
  count: number;
};
type ExpectedEmail = {
  /**
   * Checks the main heading of the email - Also referred to as title in code at some places
   */
  heading?: string;
  links?: { text: string; href: string }[];
  /**
   * Checks the sub heading of the email - Also referred to as subTitle in code
   */
  subHeading?: string;
  /**
   * Checks the <title> tag - Not sure what's the use of it, as it is not shown in UI it seems.
   */
  titleTag?: string;
  to: string;
  bookingTimeRange?: {
    start: Date;
    end: Date;
    timeZone: string;
  };
  // TODO: Implement these and more
  // what?: string;
  // when?: string;
  // who?: string;
  // where?: string;
  // additionalNotes?: string;
  // footer?: {
  //   rescheduleLink?: string;
  //   cancelLink?: string;
  // };
  ics?: {
    filename: string;
    iCalUID?: string;
    recurrence?: Recurrence;
    method: string;
  };
  /**
   * Checks that there is no
   */
  noIcs?: true;
  appsStatus?: AppsStatus[];
};
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toHaveEmail(expectedEmail: ExpectedEmail, to: string): R;
    }
  }
}

expect.extend({
  toHaveEmail(emails: Fixtures["emails"], expectedEmail: ExpectedEmail, to: string) {
    const { isNot } = this;
    const testEmail = emails.get().find((email) => email.to.includes(to));
    const emailsToLog = emails
      .get()
      .map((email) => ({ to: email.to, html: email.html, ics: email.icalEvent }));

    if (!testEmail) {
      logger.silly("All Emails", JSON.stringify({ numEmails: emailsToLog.length, emailsToLog }));
      return {
        pass: false,
        message: () => `No email sent to ${to}. All emails are ${JSON.stringify(emailsToLog)}`,
      };
    }
    const ics = testEmail.icalEvent;
    const icsObject = ics?.content ? ical.sync.parseICS(ics?.content) : null;
    const iCalUidData = icsObject ? icsObject[expectedEmail.ics?.iCalUID || ""] : null;

    let isToAddressExpected = true;
    const isIcsFilenameExpected = expectedEmail.ics ? ics?.filename === expectedEmail.ics.filename : true;
    const isIcsUIDExpected =
      expectedEmail.ics && expectedEmail.ics.iCalUID
        ? !!(icsObject ? icsObject[expectedEmail.ics.iCalUID] : null)
        : true;
    const emailDom = parse(testEmail.html);

    const actualEmailContent = {
      titleTag: emailDom.querySelector("title")?.innerText,
      heading: emailDom.querySelector('[data-testid="heading"]')?.innerText,
      subHeading: emailDom.querySelector('[data-testid="subHeading"]')?.innerText,
      when: emailDom.querySelector('[data-testid="when"]')?.innerText,
      links: emailDom.querySelectorAll("a[href]").map((link) => ({
        text: link.innerText,
        href: link.getAttribute("href"),
      })),
    };

    const expectedEmailContent = getExpectedEmailContent(expectedEmail);
    assertHasRecurrence(expectedEmail.ics?.recurrence, (iCalUidData as VEvent)?.rrule?.toString() || "");

    const isEmailContentMatched = this.equals(
      actualEmailContent,
      expect.objectContaining(expectedEmailContent)
    );

    if (!isEmailContentMatched) {
      logger.silly("All Emails", JSON.stringify({ numEmails: emailsToLog.length, emailsToLog }));

      return {
        pass: false,
        message: () => `Email content ${isNot ? "is" : "is not"} matching. ${JSON.stringify(emailsToLog)}`,
        actual: actualEmailContent,
        expected: expectedEmailContent,
      };
    }

    isToAddressExpected = expectedEmail.to === testEmail.to;
    if (!isToAddressExpected) {
      logger.silly("All Emails", JSON.stringify({ numEmails: emailsToLog.length, emailsToLog }));
      return {
        pass: false,
        message: () => `To address ${isNot ? "is" : "is not"} matching`,
        actual: testEmail.to,
        expected: expectedEmail.to,
      };
    }

    if (!expectedEmail.noIcs && !isIcsFilenameExpected) {
      return {
        pass: false,
        actual: ics?.filename,
        expected: expectedEmail.ics?.filename,
        message: () => `ICS Filename ${isNot ? "is" : "is not"} matching`,
      };
    }

    if (!expectedEmail.noIcs && !isIcsUIDExpected) {
      const icsObjectKeys = icsObject ? Object.keys(icsObject) : [];
      const icsKey = icsObjectKeys.find((key) => key !== "vcalendar");
      if (!icsKey) throw new Error("icsKey not found");
      return {
        pass: false,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        actual: icsObject[icsKey].uid!,
        expected: expectedEmail.ics?.iCalUID,
        message: () => `Expected ICS UID ${isNot ? "is" : "isn't"} present in actual`,
      };
    }

    if (expectedEmail.noIcs && ics) {
      return {
        pass: false,
        message: () => `${isNot ? "" : "Not"} expected ics file ${JSON.stringify(ics)}`,
      };
    }

    if (expectedEmail.appsStatus) {
      const actualAppsStatus = emailDom.querySelectorAll('[data-testid="appsStatus"] li').map((li) => {
        return li.innerText.trim();
      });
      const expectedAppStatus = expectedEmail.appsStatus.map((appStatus) => {
        if (appStatus.success && !appStatus.failures) {
          return `${appStatus.appName} ✅`;
        }
        return `${appStatus.appName} ❌`;
      });

      const isAppsStatusCorrect = this.equals(actualAppsStatus, expectedAppStatus);

      if (!isAppsStatusCorrect) {
        return {
          pass: false,
          actual: actualAppsStatus,
          expected: expectedAppStatus,
          message: () => `AppsStatus ${isNot ? "is" : "isn't"} matching`,
        };
      }
    }

    return {
      pass: true,
      message: () => `Email ${isNot ? "is" : "isn't"} correct`,
    };

    function getExpectedEmailContent(expectedEmail: ExpectedEmail) {
      const bookingTimeRange = expectedEmail.bookingTimeRange;
      const when = bookingTimeRange
        ? formatDateToWhenFormat(
            {
              start: bookingTimeRange.start,
              end: bookingTimeRange.end,
            },
            bookingTimeRange.timeZone
          )
        : null;

      const expectedEmailContent = {
        titleTag: expectedEmail.titleTag,
        heading: expectedEmail.heading,
        subHeading: expectedEmail.subHeading,
        when: when ? (expectedEmail.ics?.recurrence ? `starting ${when}` : `${when}`) : undefined,
        links: expect.arrayContaining(expectedEmail.links || []),
      };
      // Remove undefined props so that they aren't matched, they are intentionally left undefined because we don't want to match them
      Object.keys(expectedEmailContent).filter((key) => {
        if (expectedEmailContent[key as keyof typeof expectedEmailContent] === undefined) {
          delete expectedEmailContent[key as keyof typeof expectedEmailContent];
        }
      });
      return expectedEmailContent;
    }

    function assertHasRecurrence(expectedRecurrence: Recurrence | null | undefined, rrule: string) {
      if (!expectedRecurrence) {
        return;
      }

      const expectedRrule = `FREQ=${
        expectedRecurrence.freq === 0 ? "YEARLY" : expectedRecurrence.freq === 1 ? "MONTHLY" : "WEEKLY"
      };COUNT=${expectedRecurrence.count};INTERVAL=${expectedRecurrence.interval}`;

      logger.silly({
        expectedRrule,
        rrule,
      });
      expect(rrule).toContain(expectedRrule);
    }
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
  logger.silly("Scanning fetchCalls for webhook", safeStringify(fetchCalls));
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

  if (parsedBody.payload) {
    if (data.payload) {
      if (!!data.payload.metadata) {
        expect(parsedBody.payload.metadata).toEqual(expect.objectContaining(data.payload.metadata));
      }
      if (!!data.payload.responses)
        expect(parsedBody.payload.responses).toEqual(expect.objectContaining(data.payload.responses));

      if (!!data.payload.organizer)
        expect(parsedBody.payload.organizer).toEqual(expect.objectContaining(data.payload.organizer));

      const { responses: _1, metadata: _2, organizer: _3, ...remainingPayload } = data.payload;
      expect(parsedBody.payload).toEqual(expect.objectContaining(remainingPayload));
    }
  }
}

export function expectWorkflowToBeTriggered({
  emails,
  emailsToReceive,
}: {
  emails: Fixtures["emails"];
  emailsToReceive: string[];
}) {
  const subjectPattern = /^Reminder: /i;
  emailsToReceive.forEach((email) => {
    expect(emails.get()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: expect.stringMatching(subjectPattern),
          to: email,
        }),
      ])
    );
  });
}

export function expectWorkflowToBeNotTriggered({
  emails,
  emailsToReceive,
}: {
  emails: Fixtures["emails"];
  emailsToReceive: string[];
}) {
  const subjectPattern = /^Reminder: /i;

  emailsToReceive.forEach((email) => {
    expect(emails.get()).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: expect.stringMatching(subjectPattern),
          to: email,
        }),
      ])
    );
  });
}

export function expectSMSWorkflowToBeTriggered({
  sms,
  toNumber,
}: {
  sms: Fixtures["sms"];
  toNumber: string;
}) {
  expect(sms.get()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        to: toNumber,
      }),
    ])
  );
}

export function expectSMSWorkflowToBeNotTriggered({
  sms,
  toNumber,
}: {
  sms: Fixtures["sms"];
  toNumber: string;
}) {
  expect(sms.get()).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        to: toNumber,
      }),
    ])
  );
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
  guests,
  otherTeamMembers,
  iCalUID,
  recurrence,
  bookingTimeRange,
  booking,
  destinationEmail,
}: {
  emails: Fixtures["emails"];
  organizer: { email: string; name: string; timeZone: string };
  booker: { email: string; name: string; timeZone?: string };
  guests?: { email: string; name: string; timeZone?: string }[];
  otherTeamMembers?: { email: string; name: string; timeZone?: string }[];
  iCalUID: string;
  recurrence?: Recurrence;
  eventDomain?: string;
  bookingTimeRange?: { start: Date; end: Date };
  booking: { uid: string; urlOrigin?: string };
  destinationEmail?: string;
}) {
  const bookingUrlOrigin = booking.urlOrigin || WEBSITE_URL;
  expect(emails).toHaveEmail(
    {
      titleTag: "confirmed_event_type_subject",
      heading: recurrence ? "new_event_scheduled_recurring" : "new_event_scheduled",
      subHeading: "",
      links: recurrence
        ? [
            {
              href: `${bookingUrlOrigin}/booking/${booking.uid}?cancel=true&allRemainingBookings=true`,
              text: "cancel",
            },
          ]
        : [
            {
              href: `${bookingUrlOrigin}/reschedule/${booking.uid}`,
              text: "reschedule",
            },
          ],
      ...(bookingTimeRange
        ? {
            bookingTimeRange: {
              ...bookingTimeRange,
              timeZone: organizer.timeZone,
            },
          }
        : null),
      to: `${destinationEmail ?? organizer.email}`,
      ics: {
        filename: "event.ics",
        iCalUID: `${iCalUID}`,
        recurrence,
        method: "REQUEST",
      },
    },
    `${destinationEmail ?? organizer.email}`
  );

  expect(emails).toHaveEmail(
    {
      titleTag: "confirmed_event_type_subject",
      heading: recurrence ? "your_event_has_been_scheduled_recurring" : "your_event_has_been_scheduled",
      subHeading: "emailed_you_and_any_other_attendees",
      ...(bookingTimeRange
        ? {
            bookingTimeRange: {
              ...bookingTimeRange,
              // Using the default timezone
              timeZone: booker.timeZone || DEFAULT_TIMEZONE_BOOKER,
            },
          }
        : null),
      to: `${booker.name} <${booker.email}>`,
      ics: {
        filename: "event.ics",
        iCalUID: `${iCalUID}`,
        recurrence,
        method: "REQUEST",
      },
      links: recurrence
        ? [
            {
              href: `${bookingUrlOrigin}/booking/${booking.uid}?cancel=true&allRemainingBookings=true`,
              text: "cancel",
            },
          ]
        : [
            {
              href: `${bookingUrlOrigin}/reschedule/${booking.uid}`,
              text: "reschedule",
            },
          ],
    },
    `${booker.name} <${booker.email}>`
  );

  if (otherTeamMembers) {
    otherTeamMembers.forEach((otherTeamMember) => {
      expect(emails).toHaveEmail(
        {
          titleTag: "confirmed_event_type_subject",
          heading: recurrence ? "new_event_scheduled_recurring" : "new_event_scheduled",
          subHeading: "",
          ...(bookingTimeRange
            ? {
                bookingTimeRange: {
                  ...bookingTimeRange,
                  timeZone: otherTeamMember.timeZone || DEFAULT_TIMEZONE_BOOKER,
                },
              }
            : null),
          // Don't know why but organizer and team members of the eventType don'thave their name here like Booker
          to: `${otherTeamMember.email}`,
          ics: {
            filename: "event.ics",
            iCalUID: `${iCalUID}`,
            method: "REQUEST",
          },
          links: [
            {
              href: `${bookingUrlOrigin}/reschedule/${booking.uid}`,
              text: "reschedule",
            },
            {
              href: `${bookingUrlOrigin}/booking/${booking.uid}?cancel=true&allRemainingBookings=false`,
              text: "cancel",
            },
          ],
        },
        `${otherTeamMember.email}`
      );
    });
  }

  if (guests) {
    guests.forEach((guest) => {
      expect(emails).toHaveEmail(
        {
          titleTag: "confirmed_event_type_subject",
          heading: recurrence ? "your_event_has_been_scheduled_recurring" : "your_event_has_been_scheduled",
          subHeading: "emailed_you_and_any_other_attendees",
          ...(bookingTimeRange
            ? {
                bookingTimeRange: {
                  ...bookingTimeRange,
                  timeZone: guest.timeZone || DEFAULT_TIMEZONE_BOOKER,
                },
              }
            : null),
          to: `${guest.email}`,
          ics: {
            filename: "event.ics",
            iCalUID: `${iCalUID}`,
            method: "REQUEST",
          },
        },
        `${guest.name} <${guest.email}`
      );
    });
  }
}

export function expectBrokenIntegrationEmails({
  emails,
  organizer,
}: {
  emails: Fixtures["emails"];
  organizer: { email: string; name: string };
}) {
  // Broken Integration email is only sent to the Organizer
  expect(emails).toHaveEmail(
    {
      titleTag: "broken_integration",
      to: `${organizer.email}`,
      // No ics goes in case of broken integration email it seems
      // ics: {
      //   filename: "event.ics",
      //   iCalUID: iCalUID,
      // },
    },
    `${organizer.email}`
  );

  // expect(emails).toHaveEmail(
  //   {
  //     title: "confirmed_event_type_subject",
  //     to: `${booker.name} <${booker.email}>`,
  //   },
  //   `${booker.name} <${booker.email}>`
  // );
}

export function expectCalendarEventCreationFailureEmails({
  emails,
  organizer,
  booker,
  iCalUID,
}: {
  emails: Fixtures["emails"];
  organizer: { email: string; name: string };
  booker: { email: string; name: string };
  iCalUID: string;
}) {
  expect(emails).toHaveEmail(
    {
      titleTag: "broken_integration",
      to: `${organizer.email}`,
      ics: {
        filename: "event.ics",
        iCalUID,
        method: "REQUEST",
      },
    },
    `${organizer.email}`
  );

  expect(emails).toHaveEmail(
    {
      titleTag: "calendar_event_creation_failure_subject",
      to: `${booker.name} <${booker.email}>`,
      ics: {
        filename: "event.ics",
        iCalUID,
        method: "REQUEST",
      },
    },
    `${booker.name} <${booker.email}>`
  );
}

export function expectSuccessfulRoundRobinReschedulingEmails({
  emails,
  newOrganizer,
  prevOrganizer,
}: {
  emails: Fixtures["emails"];
  newOrganizer: { email: string; name: string };
  prevOrganizer: { email: string; name: string };
}) {
  if (newOrganizer !== prevOrganizer) {
    vi.waitFor(() => {
      // new organizer should recieve scheduling emails
      expect(emails).toHaveEmail(
        {
          heading: "new_event_scheduled",
          to: `${newOrganizer.email}`,
        },
        `${newOrganizer.email}`
      );
    });

    vi.waitFor(() => {
      // old organizer should recieve cancelled emails
      expect(emails).toHaveEmail(
        {
          heading: "event_request_cancelled",
          to: `${prevOrganizer.email}`,
        },
        `${prevOrganizer.email}`
      );
    });
  } else {
    vi.waitFor(() => {
      // organizer should recieve rescheduled emails
      expect(emails).toHaveEmail(
        {
          heading: "event_has_been_rescheduled",
          to: `${newOrganizer.email}`,
        },
        `${newOrganizer.email}`
      );
    });
  }
}

export function expectSuccessfulBookingRescheduledEmails({
  emails,
  organizer,
  booker,
  iCalUID,
  appsStatus,
}: {
  emails: Fixtures["emails"];
  organizer: { email: string; name: string };
  booker: { email: string; name: string };
  iCalUID: string;
  appsStatus?: AppsStatus[];
}) {
  expect(emails).toHaveEmail(
    {
      titleTag: "event_type_has_been_rescheduled_on_time_date",
      to: `${organizer.email}`,
      ics: {
        filename: "event.ics",
        iCalUID,
        method: "REQUEST",
      },
      appsStatus,
    },
    `${organizer.email}`
  );

  expect(emails).toHaveEmail(
    {
      titleTag: "event_type_has_been_rescheduled_on_time_date",
      to: `${booker.name} <${booker.email}>`,
      ics: {
        filename: "event.ics",
        iCalUID,
        method: "REQUEST",
      },
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
      titleTag: "awaiting_payment_subject",
      to: `${booker.name} <${booker.email}>`,
      noIcs: true,
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
      titleTag: "event_awaiting_approval_subject",
      to: `${organizer.email}`,
      noIcs: true,
    },
    `${organizer.email}`
  );

  expect(emails).toHaveEmail(
    {
      titleTag: "booking_submitted_subject",
      to: `${booker.email}`,
      noIcs: true,
    },
    `${booker.email}`
  );
}

export function expectBookingRequestRescheduledEmails({
  emails,
  loggedInUser,
  booker,
  booking,
  bookNewTimePath,
  organizer,
}: {
  emails: Fixtures["emails"];
  organizer: ReturnType<typeof getOrganizer>;
  loggedInUser: {
    email: string;
    name: string;
  };
  booker: { email: string; name: string };
  booking: { uid: string; urlOrigin?: string };
  bookNewTimePath: string;
}) {
  const bookingUrlOrigin = booking.urlOrigin || WEBSITE_URL;

  expect(emails).toHaveEmail(
    {
      titleTag: "rescheduled_event_type_subject",
      heading: "request_reschedule_booking",
      subHeading: "request_reschedule_subtitle",
      links: [
        {
          href: `${bookingUrlOrigin}${bookNewTimePath}?rescheduleUid=${booking.uid}`,
          text: "Book a new time",
        },
      ],
      to: `${booker.email}`,
      ics: {
        filename: "event.ics",
        method: "REQUEST",
      },
    },
    `${booker.email}`
  );

  expect(emails).toHaveEmail(
    {
      titleTag: "rescheduled_event_type_subject",
      heading: "request_reschedule_title_organizer",
      subHeading: "request_reschedule_subtitle_organizer",
      to: `${loggedInUser.email}`,
      ics: {
        filename: "event.ics",
        method: "REQUEST",
      },
    },
    `${loggedInUser.email}`
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
          name: {
            label: "your_name",
            value: booker.name,
            isHidden: false,
          },
          email: {
            label: "email_address",
            value: booker.email,
            isHidden: false,
          },
          location: {
            label: "location",
            value: { optionValue: "", value: location },
            isHidden: false,
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
  videoCallUrl?: string | null;
}) {
  if (!paidEvent) {
    expectWebhookToHaveBeenCalledWith(subscriberUrl, {
      triggerEvent: "BOOKING_CREATED",
      payload: {
        metadata: {
          ...(videoCallUrl ? { videoCallUrl } : null),
        },
        responses: {
          name: { label: "your_name", value: booker.name, isHidden: false },
          email: { label: "email_address", value: booker.email, isHidden: false },
          location: {
            label: "location",
            value: { optionValue: "", value: location },
            isHidden: false,
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
          name: {
            label: "name",
            value: booker.name,
          },
          email: {
            label: "email",
            value: booker.email,
          },
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
  payload,
}: {
  organizer: { email: string; name: string };
  booker: { email: string; name: string };
  subscriberUrl: string;
  location: string;
  paidEvent?: boolean;
  videoCallUrl?: string;
  payload?: Record<string, unknown>;
}) {
  expectWebhookToHaveBeenCalledWith(subscriberUrl, {
    triggerEvent: "BOOKING_RESCHEDULED",
    payload: {
      ...payload,
      metadata: {
        ...(videoCallUrl ? { videoCallUrl } : null),
      },
      responses: {
        name: { label: "your_name", value: booker.name, isHidden: false },
        email: { label: "email_address", value: booker.email, isHidden: false },
        location: {
          label: "location",
          value: { optionValue: "", value: location },
          isHidden: false,
        },
      },
    },
  });
}

export function expectBookingCancelledWebhookToHaveBeenFired({
  booker,
  location,
  subscriberUrl,
  payload,
}: {
  organizer: { email: string; name: string };
  booker: { email: string; name: string };
  subscriberUrl: string;
  location: string;
  payload?: Record<string, unknown>;
}) {
  expectWebhookToHaveBeenCalledWith(subscriberUrl, {
    triggerEvent: "BOOKING_CANCELLED",
    payload: {
      ...payload,
      metadata: null,
      responses: {
        name: {
          label: "name",
          value: booker.name,
        },
        email: {
          label: "email",
          value: booker.email,
        },
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
        name: { label: "your_name", value: booker.name, isHidden: false },
        email: { label: "email_address", value: booker.email, isHidden: false },
        location: {
          label: "location",
          value: { optionValue: "", value: location },
          isHidden: false,
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
  expected:
    | {
        calendarId?: string | null;
        videoCallUrl: string;
        destinationCalendars?: Partial<DestinationCalendar>[];
      }
    | {
        calendarId?: string | null;
        videoCallUrl: string;
        destinationCalendars?: Partial<DestinationCalendar>[];
      }[]
) {
  const expecteds = expected instanceof Array ? expected : [expected];
  expect(calendarMock.createEventCalls.length).toBe(expecteds.length);
  for (let i = 0; i < calendarMock.createEventCalls.length; i++) {
    const expected = expecteds[i];

    const calEvent = calendarMock.createEventCalls[i][0];

    expect(calEvent).toEqual(
      expect.objectContaining({
        destinationCalendar: expected.calendarId
          ? [
              expect.objectContaining({
                externalId: expected.calendarId,
              }),
            ]
          : expected.destinationCalendars
          ? expect.arrayContaining(expected.destinationCalendars.map((cal) => expect.objectContaining(cal)))
          : null,
        videoCallData: expect.objectContaining({
          url: expected.videoCallUrl,
        }),
      })
    );
  }
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

export function expectSuccessfulCalendarEventDeletionInCalendar(
  calendarMock: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createEventCalls: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateEventCalls: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deleteEventCalls: any[];
  },
  expected: {
    externalCalendarId: string;
    calEvent: Partial<CalendarEvent>;
    uid: string;
  }
) {
  expect(calendarMock.deleteEventCalls.length).toBe(1);
  const call = calendarMock.deleteEventCalls[0];
  const uid = call[0];
  const calendarEvent = call[1];
  const externalId = call[2];
  expect(uid).toBe(expected.uid);
  expect(calendarEvent).toEqual(expect.objectContaining(expected.calEvent));
  expect(externalId).toBe(expected.externalCalendarId);
}

export function expectSuccessfulVideoMeetingCreation(
  videoMock: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createMeetingCalls: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateMeetingCalls: any[];
  },
  expected: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    credential: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    calEvent: any;
  }
) {
  expect(videoMock.createMeetingCalls.length).toBe(1);
  const call = videoMock.createMeetingCalls[0];
  const callArgs = call.args;
  const calEvent = callArgs[0];
  const credential = call.credential;

  expect(credential).toEqual(expected.credential);
  expect(calEvent).toEqual(expected.calEvent);
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
  const bookingRef = call.args[0];
  const calendarEvent = call.args[1];
  expect(bookingRef).toEqual(expect.objectContaining(expected.bookingRef));
  expect(calendarEvent).toEqual(expect.objectContaining(expected.calEvent));
}

export function expectSuccessfulVideoMeetingDeletionInCalendar(
  videoMock: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createMeetingCalls: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateMeetingCalls: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deleteMeetingCalls: any[];
  },
  expected: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bookingRef: any;
  }
) {
  expect(videoMock.deleteMeetingCalls.length).toBe(1);
  const call = videoMock.deleteMeetingCalls[0];
  const bookingRefUid = call.args[0];
  expect(bookingRefUid).toEqual(expected.bookingRef.uid);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function expectBookingInDBToBeRescheduledFromTo({ from, to }: { from: any; to: any }) {
  // Expect previous booking to be cancelled
  await expectBookingToBeInDatabase({
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    ...from,
    status: BookingStatus.CANCELLED,
  });

  // Expect new booking to be created but status would depend on whether the new booking requires confirmation or not.
  await expectBookingToBeInDatabase({
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    ...to,
  });
}

export function expectICalUIDAsString(iCalUID: string | undefined | null) {
  if (typeof iCalUID !== "string") {
    throw new Error("iCalUID is not a string");
  }

  return iCalUID;
}
