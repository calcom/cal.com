import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { test, todo } from "@calcom/web/playwright/lib/fixtures";
import type { Fixtures } from "@calcom/web/playwright/lib/fixtures";
import { selectFirstAvailableTimeSlotNextMonth } from "@calcom/web/playwright/lib/testUtils";

import {
  getEmbedIframe,
  bookFirstEvent,
  getBooking,
  deleteAllBookingsByEmail,
  rescheduleEvent,
  cancelBookingThroughEmbed,
} from "../lib/testUtils";

// in parallel mode sometimes handleNewBooking endpoint throws "No available users found" error, this never happens in serial mode.
test.describe.configure({ mode: "serial" });

async function bookFirstFreeUserEventThroughEmbed({
  addEmbedListeners,
  page,
  getActionFiredDetails,
}: {
  addEmbedListeners: Fixtures["embeds"]["addEmbedListeners"];
  page: Page;
  getActionFiredDetails: Fixtures["embeds"]["getActionFiredDetails"];
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

//TODO: Change these tests to use a user/eventType per embed type atleast. This is so that we can test different themes,layouts configured in App or per EventType
test.describe("Popup Tests", () => {
  test.afterEach(async () => {
    await deleteAllBookingsByEmail("embed-user@example.com");
  });

  test("should open embed iframe on click - Configured with light theme", async ({ page, embeds }) => {
    await deleteAllBookingsByEmail("embed-user@example.com");
    const calNamespace = "e2ePopupLightTheme";
    await embeds.gotoPlayground({ calNamespace, url: "/" });

    await page.click(`[data-cal-namespace="${calNamespace}"]`);

    const embedIframe = await getEmbedIframe({ calNamespace, page, pathname: "/free" });

    await expect(embedIframe).toBeEmbedCalLink(calNamespace, embeds.getActionFiredDetails, {
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

  test("should be able to reschedule", async ({
    page,
    embeds: { addEmbedListeners, getActionFiredDetails },
  }) => {
    const booking = await test.step("Create a booking", async () => {
      return await bookFirstFreeUserEventThroughEmbed({
        page,
        addEmbedListeners,
        getActionFiredDetails,
      });
    });

    await test.step("Reschedule the booking", async () => {
      const calNamespace = "popupRescheduleWithReschedulePath";
      await addEmbedListeners(calNamespace);
      await page.goto(`/?popupRescheduleUid=${booking.uid}`);
      await page.click(`[data-cal-namespace="${calNamespace}"]`);
      const embedIframe = await getEmbedIframe({ calNamespace, page, pathname: booking.eventSlug });
      if (!embedIframe) {
        throw new Error("Embed iframe not found");
      }
      await rescheduleEvent("free", embedIframe, page);
    });
  });

  todo("Add snapshot test for embed iframe");

  test("should be able to cancel booking through embed iframe", async ({
    page,
    embeds: { addEmbedListeners, getActionFiredDetails },
  }) => {
    const booking = await test.step("Create a booking", async () => {
      return await bookFirstFreeUserEventThroughEmbed({
        page,
        addEmbedListeners,
        getActionFiredDetails,
      });
    });

    await test.step("Cancel the booking through embed", async () => {
      const calNamespace = "popupCancelBooking";
      await addEmbedListeners(calNamespace);
      await page.goto(`/?popupCancelUid=${booking.uid}`);
      await page.click(`[data-cal-namespace="${calNamespace}"]`);
      const embedIframe = await getEmbedIframe({ calNamespace, page, pathname: `/booking/${booking.uid}` });
      if (!embedIframe) {
        throw new Error("Embed iframe not found");
      }
      await cancelBookingThroughEmbed(booking.uid, embedIframe, page);
    });

    const cancelledBooking = await getBooking(booking.uid);
    expect(cancelledBooking.status).toBe("CANCELLED");
  });

  test("should open Routing Forms embed on click", async ({
    page,
    embeds: { addEmbedListeners, getActionFiredDetails },
  }) => {
    await deleteAllBookingsByEmail("embed-user@example.com");

    const calNamespace = "routingFormAuto";
    await addEmbedListeners(calNamespace);
    await page.goto("/?only=prerender-test");
    await page.click(
      `[data-cal-namespace=${calNamespace}][data-cal-link="forms/948ae412-d995-4865-875a-48302588de03"]`
    );
    const embedIframe = await getEmbedIframe({
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

  test.describe("Floating Button Popup", () => {
    test.describe("Pro User - Configured in App with default setting of system theme", () => {
      test("should open embed iframe according to system theme when no theme is configured through Embed API", async ({
        page,
        embeds: { addEmbedListeners, getActionFiredDetails },
      }) => {
        const calNamespace = "floatingButton";
        await addEmbedListeners(calNamespace);
        await page.goto("/?only=ns:floatingButton");

        await page.click('[data-cal-namespace="floatingButton"] > button');

        const embedIframe = await getEmbedIframe({ calNamespace, page, pathname: "/pro" });
        await expect(embedIframe).toBeEmbedCalLink(calNamespace, getActionFiredDetails, {
          pathname: "/pro",
        });

        if (!embedIframe) {
          throw new Error("Embed iframe not found");
        }
        const html = embedIframe.locator("html");
        // Expect "light" theme as configured in App for pro user.
        await expect(html).toHaveClass(/light/);
        const { uid: bookingId } = await bookFirstEvent("pro", embedIframe, page);
        const booking = await getBooking(bookingId);
        expect(booking.attendees.length).toBe(3);
        await test.step("Close the modal", async () => {
          await page.locator("cal-modal-box .close").click();
          await expect(page.locator("cal-modal-box")).toBeHidden();
          await expect(page.locator("cal-modal-box iframe")).toBeHidden();
        });
      });

      test("should open embed iframe according to system theme when configured with 'auto' theme using Embed API", async ({
        page,
        embeds: { addEmbedListeners, getActionFiredDetails },
      }) => {
        const calNamespace = "floatingButton";
        await addEmbedListeners(calNamespace);
        await page.goto("/?only=ns:floatingButton");

        await page.click('[data-cal-namespace="floatingButton"] > button');

        const embedIframe = await getEmbedIframe({ calNamespace, page, pathname: "/pro" });
        await expect(embedIframe).toBeEmbedCalLink(calNamespace, getActionFiredDetails, {
          pathname: "/pro",
        });

        if (!embedIframe) {
          throw new Error("Embed iframe not found");
        }

        const html = embedIframe.locator("html");
        const prefersDarkScheme = await page.evaluate(() => {
          return window.matchMedia("(prefers-color-scheme: dark)").matches;
        });
        // Detect browser preference and expect accordingly

        prefersDarkScheme ? await expect(html).toHaveClass(/dark/) : await expect(html).toHaveClass(/light/);
      });

      test("should open embed iframe(Booker Profile Page) with dark theme when configured with dark theme using Embed API", async ({
        page,
        embeds: { addEmbedListeners, getActionFiredDetails },
      }) => {
        const calNamespace = "floatingButton";
        await addEmbedListeners(calNamespace);
        await page.goto("/?only=ns:floatingButton&theme=dark");

        await page.click('[data-cal-namespace="floatingButton"] > button');

        const embedIframe = await getEmbedIframe({ calNamespace, page, pathname: "/pro" });
        await expect(embedIframe).toBeEmbedCalLink(calNamespace, getActionFiredDetails, {
          pathname: "/pro",
        });

        if (!embedIframe) {
          throw new Error("Embed iframe not found");
        }

        const html = embedIframe.locator("html");
        await expect(html).toHaveClass(/dark/);
      });

      test("should open embed iframe(Event Booking Page) with dark theme when configured with dark theme using Embed API", async ({
        page,
        embeds: { addEmbedListeners, getActionFiredDetails },
      }) => {
        const calNamespace = "floatingButton";
        await addEmbedListeners(calNamespace);
        await page.goto("/?only=ns:floatingButton&cal-link=pro/30min&theme=dark");

        await page.click('[data-cal-namespace="floatingButton"] > button');

        const embedIframe = await getEmbedIframe({ calNamespace, page, pathname: "/pro/30min" });
        await expect(embedIframe).toBeEmbedCalLink(calNamespace, getActionFiredDetails, {
          pathname: "/pro/30min",
        });

        if (!embedIframe) {
          throw new Error("Embed iframe not found");
        }

        const html = embedIframe.locator("html");
        await expect(html).toHaveClass(/dark/);
      });
    });
  });

  test("prendered embed should be loaded and apply the config given to it", async ({ page, embeds }) => {
    const calNamespace = "e2ePrerenderLightTheme";
    const calLink = "/free/30min";
    await embeds.gotoPlayground({ calNamespace, url: "/?only=prerender-test" });
    await expectPrerenderedIframe({ calNamespace, calLink, embeds, page });

    await page.click(`[data-cal-namespace="${calNamespace}"]`);

    const embedIframe = await getEmbedIframe({ calNamespace, page, pathname: calLink });
    // eslint-disable-next-line playwright/no-conditional-in-test
    if (!embedIframe) {
      throw new Error("Embed iframe not found");
    }
    await selectFirstAvailableTimeSlotNextMonth(embedIframe);
    await expect(embedIframe.locator('[name="name"]')).toHaveValue("Preloaded Prefilled");
    await expect(embedIframe.locator('[name="email"]')).toHaveValue("preloaded-prefilled@example.com");

    await expect(embedIframe).toBeEmbedCalLink(calNamespace, embeds.getActionFiredDetails, {
      pathname: calLink,
    });
  });

  test("should open on clicking child element", async ({ page, embeds }) => {
    await deleteAllBookingsByEmail("embed-user@example.com");
    const calNamespace = "childElementTarget";
    const configuredLink = "/free/30min";
    await embeds.gotoPlayground({ calNamespace, url: "/" });

    await page.click(`[data-cal-namespace="${calNamespace}"] b`);

    const embedIframe = await getEmbedIframe({ calNamespace, page, pathname: configuredLink });

    await expect(embedIframe).toBeEmbedCalLink(calNamespace, embeds.getActionFiredDetails, {
      pathname: configuredLink,
    });
  });

  test("should open embed iframe on click - Configured with hide eventType details", async ({
    page,
    embeds,
  }) => {
    await deleteAllBookingsByEmail("embed-user@example.com");
    const calNamespace = "popupHideEventTypeDetails";

    await embeds.gotoPlayground({ calNamespace, url: "/" });

    await page.click(`[data-cal-namespace="${calNamespace}"]`);

    const embedIframe = await getEmbedIframe({ calNamespace, page, pathname: "/free/30min" });

    await expect(embedIframe).toBeEmbedCalLink(calNamespace, embeds.getActionFiredDetails, {
      pathname: "/free/30min",
    });
  });
});

async function expectPrerenderedIframe({
  page,
  calNamespace,
  calLink,
  embeds,
}: {
  page: Page;
  calNamespace: string;
  calLink: string;
  embeds: Fixtures["embeds"];
}) {
  const prerenderedIframe = await getEmbedIframe({ calNamespace, page, pathname: calLink });

  if (!prerenderedIframe) {
    throw new Error("Prerendered iframe not found");
  }
  await expect(prerenderedIframe).toBeEmbedCalLink(
    calNamespace,
    embeds.getActionFiredDetails,
    {
      pathname: calLink,
    },
    true
  );
}
