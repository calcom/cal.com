import { Page, Frame, test, expect } from "@playwright/test";

import prisma from "@lib/prisma";

export function todo(title: string) {
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
  // FIXME: Need to wait for the iframe to be properly added to shadow dom. There should be a no time boundation way to do it.
  await new Promise((resolve) => {
    // Keep checking
    const interval = setInterval(() => {
      if (page.frame("cal-embed")) {
        resolve(true);
      }
    }, 1000);

    // Hard Timer
    setTimeout(() => {
      clearInterval(interval);
      resolve(true);
    }, 10000);
  });
  const embedIframe = page.frame("cal-embed");
  if (!embedIframe) {
    return null;
  }
  const u = new URL(embedIframe.url());
  if (u.pathname === pathname) {
    return embedIframe;
  }
  return null;
};

async function selectFirstAvailableTimeSlotNextMonth(frame: Frame, page: Page) {
  await frame.click('[data-testid="incrementMonth"]');
  // @TODO: Find a better way to make test wait for full month change render to end
  // so it can click up on the right day, also when resolve remove other todos
  // Waiting for full month increment
  await frame.waitForTimeout(1000);
  expect(await page.screenshot()).toMatchSnapshot("availability-page-2.png");
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
  expect(await page.screenshot()).toMatchSnapshot("availability-page-1.png");
  await selectFirstAvailableTimeSlotNextMonth(frame, page);
  await frame.waitForNavigation({
    url(url) {
      return url.pathname.includes(`/${username}/book`);
    },
  });
  expect(await page.screenshot()).toMatchSnapshot("booking-page.png");
  // --- fill form
  await frame.fill('[name="name"]', "Embed User");
  await frame.fill('[name="email"]', "embed-user@example.com");
  await frame.press('[name="email"]', "Enter");
  const response = await page.waitForResponse("**/api/book/event");
  const responseObj = await response.json();
  const bookingId = responseObj.uid;
  // Make sure we're navigated to the success page
  await expect(frame.locator("[data-testid=success-page]")).toBeVisible();
  expect(await page.screenshot()).toMatchSnapshot("success-page.png");
  return bookingId;
}
