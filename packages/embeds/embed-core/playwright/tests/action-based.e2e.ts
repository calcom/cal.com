import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { test } from "@calcom/web/playwright/lib/fixtures";
import type { Fixtures } from "@calcom/web/playwright/lib/fixtures";

import {
  todo,
  getEmbedIframe,
  bookFirstEvent,
  getBooking,
  deleteAllBookingsByEmail,
  rescheduleEvent,
} from "../lib/testUtils";

async function bookFirstFreeUserEventThroughEmbed({
  addEmbedListeners,
  page,
  getActionFiredDetails,
}: {
  addEmbedListeners: Fixtures["addEmbedListeners"];
  page: Page;
  getActionFiredDetails: Fixtures["getActionFiredDetails"];
}) {
  const embedButtonLocator = page.locator('[data-cal-link="free"]').first();
  await page.goto("/");
  // Obtain cal namespace from the element being clicked itself, so that addEmbedListeners always listen to correct namespace
  const calNamespace = (await embedButtonLocator.getAttribute("data-cal-namespace")) || "";
  await addEmbedListeners(calNamespace);
  // Goto / again so that initScript attached using addEmbedListeners can work now.
  await page.goto("/");

  await embedButtonLocator.click();

  const embedIframe = await getEmbedIframe({ calNamespace, page, pathname: "/free" });

  await expect(embedIframe).toBeEmbedCalLink(calNamespace, getActionFiredDetails, {
    pathname: "/free",
  });
  if (!embedIframe) {
    throw new Error("Embed iframe not found");
  }
  const booking = await bookFirstEvent("free", embedIframe, page);
  return booking;
}

test.describe("Popup Tests", () => {
  test.afterEach(async () => {
    await deleteAllBookingsByEmail("embed-user@example.com");
  });
  test("should open embed iframe on click - Configured with light theme", async ({
    page,
    addEmbedListeners,
    getActionFiredDetails,
  }) => {
    await deleteAllBookingsByEmail("embed-user@example.com");

    const calNamespace = "prerendertestLightTheme";
    await addEmbedListeners(calNamespace);
    await page.goto("/?only=prerender-test");
    let embedIframe = await getEmbedIframe({ calNamespace, page, pathname: "/free" });
    expect(embedIframe).toBeFalsy();

    await page.click('[data-cal-link="free?light&popup"]');

    embedIframe = await getEmbedIframe({ calNamespace, page, pathname: "/free" });

    await expect(embedIframe).toBeEmbedCalLink(calNamespace, getActionFiredDetails, {
      pathname: "/free",
    });
    // expect(await page.screenshot()).toMatchSnapshot("event-types-list.png");
    if (!embedIframe) {
      throw new Error("Embed iframe not found");
    }
    const { uid: bookingId } = await bookFirstEvent("free", embedIframe, page);
    const booking = await getBooking(bookingId);

    expect(booking.attendees.length).toBe(1);
    await deleteAllBookingsByEmail("embed-user@example.com");
  });

  test("should be able to reschedule", async ({ page, addEmbedListeners, getActionFiredDetails }) => {
    const booking = await test.step("Create a booking", async () => {
      return await bookFirstFreeUserEventThroughEmbed({
        page,
        addEmbedListeners,
        getActionFiredDetails,
      });
    });

    await test.step("Reschedule the booking", async () => {
      await addEmbedListeners("popupReschedule");
      await page.goto(`/?popupRescheduleId=${booking.uid}`);
      await page.click('[data-cal-namespace="popupReschedule"]');
      const calNamespace = "popupReschedule";
      const embedIframe = await getEmbedIframe({ calNamespace, page, pathname: booking.eventSlug });
      if (!embedIframe) {
        throw new Error("Embed iframe not found");
      }
      await rescheduleEvent("free", embedIframe, page);
    });
  });

  todo("Floating Button Test with Dark Theme");

  todo("Floating Button Test with Light Theme");

  todo("Add snapshot test for embed iframe");

  test("should open Routing Forms embed on click", async ({
    page,
    addEmbedListeners,
    getActionFiredDetails,
  }) => {
    await deleteAllBookingsByEmail("embed-user@example.com");

    const calNamespace = "routingFormAuto";
    await addEmbedListeners(calNamespace);
    await page.goto("/?only=prerender-test");
    let embedIframe = await getEmbedIframe({
      calNamespace,
      page,
      pathname: "/forms/948ae412-d995-4865-875a-48302588de03",
    });
    expect(embedIframe).toBeFalsy();
    await page.click(
      `[data-cal-namespace=${calNamespace}][data-cal-link="forms/948ae412-d995-4865-875a-48302588de03"]`
    );
    embedIframe = await getEmbedIframe({
      calNamespace,
      page,
      pathname: "/forms/948ae412-d995-4865-875a-48302588de03",
    });
    if (!embedIframe) {
      throw new Error("Routing Form embed iframe not found");
    }
    await expect(embedIframe).toBeEmbedCalLink(calNamespace, getActionFiredDetails, {
      pathname: "/forms/948ae412-d995-4865-875a-48302588de03",
    });
    await expect(embedIframe.locator("text=Seeded Form - Pro")).toBeVisible();
  });
});
