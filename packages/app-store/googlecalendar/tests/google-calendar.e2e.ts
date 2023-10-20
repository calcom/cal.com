import { expect } from "@playwright/test";

import dayjs from "@calcom/dayjs";
import { APP_CREDENTIAL_SHARING_ENABLED } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { test } from "@calcom/web/playwright/lib/fixtures";
import { selectSecondAvailableTimeSlotNextMonth } from "@calcom/web/playwright/lib/testUtils";

import metadata from "../_metadata";
import { createBookingAndFetchGCalEvent, deleteBookingAndEvent } from "./testUtils";

test.describe("Google Calendar", async () => {
  let qaUser: Prisma.UserGetPayload<{ select: { username: true } }> | null;
  let qaGCalCredential: Prisma.CredentialGetPayload<{ select: { id: true } }> | null;
  test.beforeAll(async () => {
    let runIntegrationTest = false;

    test.skip(!!APP_CREDENTIAL_SHARING_ENABLED, "Credential sharing enabled");

    if (process.env.E2E_TEST_CALCOM_QA_EMAIL && process.env.E2E_TEST_CALCOM_QA_PASSWORD) {
      qaGCalCredential = await prisma.credential.findFirst({
        where: {
          user: {
            email: process.env.E2E_TEST_CALCOM_QA_EMAIL,
          },
          type: metadata.type,
        },
        select: {
          id: true,
        },
      });

      qaUser = await prisma.user.findFirst({
        where: {
          email: process.env.E2E_TEST_CALCOM_QA_EMAIL,
        },
        select: {
          username: true,
        },
      });

      if (qaGCalCredential && qaUser) runIntegrationTest = true;
    }

    test.skip(!runIntegrationTest, "QA user not found");
  });

  test("On new booking, event should be created on GCal", async ({ page }) => {
    const { gCalEvent, gCalReference, booking, authedCalendar } = await createBookingAndFetchGCalEvent(
      page,
      qaGCalCredential,
      qaUser?.username
    );

    // if (!gCalReference) throw new Error("gCalReference not found");

    // Ensure that the start and end times are matching
    const startTimeMatches = dayjs(booking.startTime).isSame(
      dayjs(gCalEvent.start?.dateTime).tz(gCalEvent.start.timeZone)
    );
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    const endTimeMatches = dayjs(booking.endTime).isSame(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      dayjs(gCalEvent.end?.dateTime).tz(gCalEvent.end.timeZone)
    );
    expect(startTimeMatches && endTimeMatches).toBe(true);

    // Ensure that the titles are matching
    expect(booking.title).toBe(gCalEvent.summary);

    // TODO ensure that the attendee is on the event
    const bookingAttendee = booking?.attendees[0].email;
    const attendeeInGCalEvent = gCalEvent.attendees?.find((attendee) => attendee.email === bookingAttendee);
    expect(attendeeInGCalEvent).toBeTruthy();

    await deleteBookingAndEvent(authedCalendar, booking.uid, gCalReference.uid);
  });

  test("On reschedule, event should be updated on GCal", async ({ page }) => {
    // Reschedule the booking and check the gCalEvent's time is also changed
    // On reschedule gCal UID stays the same
    const { gCalReference, booking, authedCalendar } = await createBookingAndFetchGCalEvent(
      page,
      qaGCalCredential,
      qaUser?.username
    );

    await page.locator('[data-testid="reschedule-link"]').click();

    await selectSecondAvailableTimeSlotNextMonth(page);
    await page.locator('[data-testid="confirm-reschedule-button"]').click();

    await expect(page.locator("[data-testid=success-page]")).toBeVisible();

    const rescheduledBookingUrl = await page.url();
    const rescheduledBookingUid = rescheduledBookingUrl.match(/booking\/([^\/?]+)/);

    // Get the rescheduled booking start and end times
    const rescheduledBooking = await prisma.booking.findFirst({
      where: {
        uid: rescheduledBookingUid[1],
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    // The GCal event UID persists after reschedule but should get the rescheduled data
    const gCalRescheduledEventResponse = await authedCalendar.events.get({
      calendarId: "primary",
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      eventId: gCalReference.uid,
    });

    expect(gCalRescheduledEventResponse.status).toBe(200);

    const rescheduledGCalEvent = gCalRescheduledEventResponse.data;

    // Ensure that the new start and end times are matching
    const rescheduledStartTimeMatches = dayjs(rescheduledBooking.startTime).isSame(
      dayjs(rescheduledGCalEvent.start?.dateTime).tz(rescheduledGCalEvent.start?.timeZone)
    );
    const rescheduledEndTimeMatches = dayjs(rescheduledBooking.endTime).isSame(
      dayjs(rescheduledGCalEvent.end?.dateTime).tz(rescheduledGCalEvent.end.timeZone)
    );
    expect(rescheduledStartTimeMatches && rescheduledEndTimeMatches).toBe(true);

    // After test passes we can delete the bookings and GCal event
    await deleteBookingAndEvent(authedCalendar, booking.uid, gCalReference.uid);

    await prisma.booking.delete({
      where: {
        uid: rescheduledBookingUid[1],
      },
    });
  });

  test("When canceling the booking, the GCal event should also be deleted", async ({ page }) => {
    const { gCalEvent, gCalReference, booking, authedCalendar } = await createBookingAndFetchGCalEvent(
      page,
      qaGCalCredential,
      qaUser?.username
    );

    // Cancel the booking
    await page.locator('[data-testid="cancel"]').click();
    await page.locator('[data-testid="confirm_cancel"]').click();
    // Query for the bookingUID and ensure that it doesn't exist on GCal

    await page.waitForSelector('[data-testid="cancelled-headline"]');

    const canceledGCalEventResponse = await authedCalendar.events.get({
      calendarId: "primary",
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      eventId: gCalReference.uid,
    });

    expect(canceledGCalEventResponse.data.status).toBe("cancelled");

    // GCal API sees canceled events as already deleted
    await deleteBookingAndEvent(authedCalendar, booking.uid);
  });
});
