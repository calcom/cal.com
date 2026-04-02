import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { bookTimeSlot, selectSecondAvailableTimeSlotNextMonth } from "@calcom/web/playwright/lib/testUtils";
import type { calendar_v3 } from "@googleapis/calendar";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import metadata from "../_metadata";
import { createGoogleCalendarServiceWithGoogleType } from "../lib/CalendarService";

/**
 * Creates the booking on Cal.com and makes the GCal call to fetch the event.
 * Ends on the booking success page
 * @param page
 *
 * @returns the raw GCal event GET response and the booking reference
 */
export const createBookingAndFetchGCalEvent = async (
  page: Page,
  qaGCalCredential: Prisma.CredentialGetPayload<{ select: { id: true } }> | null,
  qaUsername: string
) => {
  await page.goto(`/${qaUsername}/15min`);
  await selectSecondAvailableTimeSlotNextMonth(page);
  await bookTimeSlot(page);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  await page.waitForNavigation({ state: "networkidle" });
  await page.locator("[data-testid=success-page]");

  const bookingUrl = await page.url();
  const bookingUid = bookingUrl.match(/booking\/([^/?]+)/);
  assertValueExists(bookingUid, "bookingUid");

  const [gCalReference, booking] = await Promise.all([
    prisma.bookingReference.findFirst({
      where: {
        booking: {
          uid: bookingUid[1],
        },
        type: metadata.type,
        credentialId: qaGCalCredential?.id,
        deleted: null,
      },
      select: {
        uid: true,
        booking: {},
      },
    }),
    prisma.booking.findFirst({
      where: {
        uid: bookingUid[1],
      },
      select: {
        uid: true,
        startTime: true,
        endTime: true,
        title: true,
        attendees: {
          select: {
            email: true,
          },
        },
        user: {
          select: {
            email: true,
          },
        },
      },
    }),
  ]);
  assertValueExists(gCalReference, "gCalReference");

  assertValueExists(booking, "booking");

  // Need to refresh keys from DB
  const refreshedCredential = await prisma.credential.findFirst({
    where: {
      id: qaGCalCredential?.id,
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  expect(refreshedCredential).toBeTruthy();

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-expect-error
  const googleCalendarService = createGoogleCalendarServiceWithGoogleType(refreshedCredential);

  const authedCalendar = await googleCalendarService.authedCalendar();

  const gCalEventResponse = await authedCalendar.events.get({
    calendarId: "primary",
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-expect-error
    eventId: gCalReference.uid,
  });

  expect(gCalEventResponse.status).toBe(200);

  return { gCalEvent: gCalEventResponse.data, gCalReference, booking, authedCalendar };
};

export const deleteBookingAndEvent = async (
  authedCalendar: calendar_v3.Calendar,
  bookingUid: string,
  gCalReferenceUid?: string
) => {
  // After test passes we can delete the booking and GCal event
  await prisma.booking.delete({
    where: {
      uid: bookingUid,
    },
  });

  if (gCalReferenceUid) {
    await authedCalendar.events.delete({
      calendarId: "primary",
      eventId: gCalReferenceUid,
    });
  }
};

export function assertValueExists(value: unknown, variableName?: string): asserts value {
  if (!value) {
    throw new Error(`Value is not defined: ${variableName}`);
  }
}
