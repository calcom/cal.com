import { expect } from "@playwright/test";

import { test } from "../fixtures/fixtures";
import { todo, getEmbedIframe, bookFirstEvent, getBooking, deleteAllBookingsByEmail } from "../lib/testUtils";

test("should open embed iframe on click - Configured with light theme", async ({
  page,
  addEmbedListeners,
  getActionFiredDetails,
}) => {
  await deleteAllBookingsByEmail("embed-user@example.com");

  const calNamespace = "prerendertestLightTheme";
  await addEmbedListeners(calNamespace);
  await page.goto("/?only=prerender-test");
  let embedIframe = await getEmbedIframe({ page, pathname: "/free" });
  expect(embedIframe).toBeFalsy();

  await page.click('[data-cal-link="free?light&popup"]');

  embedIframe = await getEmbedIframe({ page, pathname: "/free" });

  await expect(embedIframe).toBeEmbedCalLink(calNamespace, getActionFiredDetails, {
    pathname: "/free",
  });
  expect(await page.screenshot()).toMatchSnapshot("event-types-list.png");
  if (!embedIframe) {
    throw new Error("Embed iframe not found");
  }
  const bookingId = await bookFirstEvent("free", embedIframe, page);
  const booking = await getBooking(bookingId);

  expect(booking.attendees.length).toBe(1);
  await deleteAllBookingsByEmail("embed-user@example.com");
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
  let embedIframe = await getEmbedIframe({ page, pathname: "/forms/948ae412-d995-4865-875a-48302588de03" });
  expect(embedIframe).toBeFalsy();
  await page.click(
    `[data-cal-namespace=${calNamespace}][data-cal-link="forms/948ae412-d995-4865-875a-48302588de03"]`
  );
  embedIframe = await getEmbedIframe({ page, pathname: "/forms/948ae412-d995-4865-875a-48302588de03" });
  if (!embedIframe) {
    throw new Error("Routing Form embed iframe not found");
  }
  await expect(embedIframe).toBeEmbedCalLink(calNamespace, getActionFiredDetails, {
    pathname: "/forms/948ae412-d995-4865-875a-48302588de03",
  });
  await expect(embedIframe.locator("text=Seeded Form - Pro")).toBeVisible();
});
