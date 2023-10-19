import { expect } from "@playwright/test";

import prisma from "@calcom/prisma";
import { test } from "@calcom/web/playwright/lib/fixtures";
import { bookFirstEvent } from "@calcom/web/playwright/lib/testUtils";

import metadata from "../_metadata";
import GoogleCalendarService from "../lib/CalendarService";

test.describe("Google Calendar", async () => {
  let qaUser;
  let qaGCalCredential;
  test.beforeAll(async () => {
    let runIntegrationTest = false;

    // TODO disable if credential syncing is in place

    if (process.env.E2E_TEST_CALCOM_QA_EMAIL && process.env.E2E_TEST_CALCOM_QA_PASSWORD) {
      qaGCalCredential = await prisma.credential.findFirst({
        where: {
          user: {
            email: process.env.E2E_TEST_CALCOM_QA_EMAIL,
          },
          type: metadata.type,
        },
      });

      qaUser = await prisma.user.findFirst({
        where: {
          email: process.env.E2E_TEST_CALCOM_QA_EMAIL,
        },
      });

      if (qaGCalCredential) runIntegrationTest = true;
    }

    test.skip(!runIntegrationTest, "QA user not found");
  });

  test("On new booking, event should be created on GCal", async ({ page, users }) => {
    await page.goto(`/${qaUser.username}`);
    await bookFirstEvent(page);

    const bookingUrl = await page.url();
    const bookingUid = bookingUrl.match(/booking\/([^\/?]+)/);

    const gCalReference = await prisma.bookingReference.findFirst({
      where: {
        booking: {
          uid: bookingUid[1],
        },
        type: metadata.type,
        credentialId: qaGCalCredential.id,
      },
    });

    const gCalCredentials = await prisma.credential.findFirst({
      where: {
        id: qaGCalCredential.id,
      },
      select: {
        key: true,
      },
    });

    const googleCalendarService = new GoogleCalendarService(gCalCredentials);

    const authedCalendar = await googleCalendarService.authedCalendar();

    const gCalEvent = await authedCalendar.events.get({
      calendarId: "primary",
      eventId: gCalReference.uid,
    });
    console.log("🚀 ~ file: google-calendar.e2e.ts:74 ~ test ~ gCalEvent:", gCalEvent);

    expect(gCalEvent.status).toBe(200);
  });
});
