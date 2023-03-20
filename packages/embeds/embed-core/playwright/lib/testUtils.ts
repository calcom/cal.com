import type { Page, Frame } from "@playwright/test";
import { test, expect } from "@playwright/test";

import prisma from "@calcom/prisma";

export function todo(title: string) {
  // eslint-disable-next-line @typescript-eslint/no-empty-function, playwright/no-skipped-test
  test.skip(title, () => {});
}

export const deleteAllBookingsByEmail = async (email: string) =>
  await prisma.booking.deleteMany({
    where: {
      attendees: {
        some: {
          email: email,
        },
      },
    },
  });

export const getBooking = async (bookingId: string) => {
  const booking = await prisma.booking.findUnique({
    where: {
      uid: bookingId,
    },
    include: {
      attendees: true,
    },
  });
  if (!booking) {
    throw new Error("Booking not found");
  }
  return booking;
};

export const getEmbedIframe = async ({ page, pathname }: { page: Page; pathname: string }) => {
  // We can't seem to access page.frame till contentWindow is available. So wait for that.
  const iframeReady = await page.evaluate(() => {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        const iframe = document.querySelector<HTMLIFrameElement>(".cal-embed");
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (iframe && iframe.contentWindow && window.iframeReady) {
          clearInterval(interval);
          resolve(true);
        } else {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          console.log("Iframe Status:", !!iframe, !!iframe?.contentWindow, window.iframeReady);
        }
      }, 500);

      // A hard timeout if iframe isn't ready in that time. Avoids infinite wait
      setTimeout(() => {
        clearInterval(interval);
        resolve(false);
        // This is the time embed-iframe.ts loads in the iframe and fires atleast one event. Also, it is a load of entire React Application so it can sometime take more time even on CI.
      }, 15000);
    });
  });
  if (!iframeReady) {
    return null;
  }

  // We just verified that iframeReady is true here, so obviously embedIframe is not null
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const embedIframe = page.frame("cal-embed")!;
  const u = new URL(embedIframe.url());
  if (u.pathname === pathname + "/embed") {
    return embedIframe;
  }
  console.log('Embed iframe url pathname match. Expected: "' + pathname + '/embed"', "Actual: " + u.pathname);
  return null;
};

async function selectFirstAvailableTimeSlotNextMonth(frame: Frame, page: Page) {
  await frame.click('[data-testid="incrementMonth"]');

  // @TODO: Find a better way to make test wait for full month change render to end
  // so it can click up on the right day, also when done, resolve other todos as well
  // The problem is that the Month Text changes instantly but we don't know when the corresponding dates are visible

  // Waiting for full month increment
  await frame.waitForTimeout(1000);
  // expect(await page.screenshot()).toMatchSnapshot("availability-page-2.png");
  // TODO: Find out why the first day is always booked on tests
  await frame.locator('[data-testid="day"][data-disabled="false"]').nth(1).click();
  await frame.click('[data-testid="time"]');
}

export async function bookFirstEvent(username: string, frame: Frame, page: Page) {
  // Click first event type
  await frame.click('[data-testid="event-type-link"]');
  await frame.waitForNavigation({
    url(url) {
      return !!url.pathname.match(new RegExp(`/${username}/.*$`));
    },
  });

  // Let current month dates fully render.
  // There is a bug where if we don't let current month fully render and quickly click go to next month, current month get's rendered
  // This doesn't seem to be replicable with the speed of a person, only during automation.
  // It would also allow correct snapshot to be taken for current month.
  await frame.waitForTimeout(1000);
  // expect(await page.screenshot()).toMatchSnapshot("availability-page-1.png");
  const eventSlug = new URL(frame.url()).pathname;
  await selectFirstAvailableTimeSlotNextMonth(frame, page);
  await frame.waitForNavigation({
    url(url) {
      return url.pathname.includes(`/${username}/book`);
    },
  });
  // expect(await page.screenshot()).toMatchSnapshot("booking-page.png");
  // --- fill form
  await frame.fill('[name="name"]', "Embed User");
  await frame.fill('[name="email"]', "embed-user@example.com");
  await frame.press('[name="email"]', "Enter");
  const response = await page.waitForResponse("**/api/book/event");
  const booking = (await response.json()) as { uid: string; eventSlug: string };
  booking.eventSlug = eventSlug;

  // Make sure we're navigated to the success page
  await expect(frame.locator("[data-testid=success-page]")).toBeVisible();
  // expect(await page.screenshot()).toMatchSnapshot("success-page.png");

  //NOTE: frame.click('body') won't work here. Because the way it works, it clicks on the center of the body tag which is an element inside the popup view and that won't close the popup
  await frame.evaluate(() => {
    // Closes popup - if it is a popup. If not a popup, it will just do nothing
    document.body.click();
  });

  return booking;
}

export async function rescheduleEvent(username, frame, page) {
  await selectFirstAvailableTimeSlotNextMonth(frame, page);
  await frame.waitForNavigation({
    url(url) {
      return url.pathname.includes(`/${username}/book`);
    },
  });
  // --- fill form
  await frame.press('[name="email"]', "Enter");
  await frame.click("[data-testid=confirm-reschedule-button]");
  const response = await page.waitForResponse("**/api/book/event");
  const responseObj = await response.json();
  const booking = responseObj.uid;
  // Make sure we're navigated to the success page
  await expect(frame.locator("[data-testid=success-page]")).toBeVisible();
  return booking;
}
