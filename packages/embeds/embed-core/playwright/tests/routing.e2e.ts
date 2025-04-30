import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { uuid } from "short-uuid";

import { test } from "@calcom/web/playwright/lib/fixtures";
import type { Fixtures } from "@calcom/web/playwright/lib/fixtures";
import { doOnOrgDomain } from "@calcom/web/playwright/lib/testUtils";

import { getEmbedIframe, getBooking, deleteAllBookingsByEmail, bookEvent } from "../lib/testUtils";

// in parallel mode sometimes handleNewBooking endpoint throws "No available users found" error, this never happens in serial mode.
test.describe.configure({ mode: "serial" });

//TODO: Change these tests to use a user/eventType per embed type atleast. This is so that we can test different themes,layouts configured in App or per EventType
test.describe("Popup Tests", () => {
  test.afterEach(async () => {
    await deleteAllBookingsByEmail("embed-user@example.com");
  });

  test("should be able to book an event through headless router using a prerendered link", async ({
    page,
    embeds,
  }) => {
    await deleteAllBookingsByEmail("embed-user@example.com");
    const calNamespace = "routingFormPrerender";
    const expectedPreloadedLink = "/team/insights-team/team-javascript";
    const expectedRedirectFromRoutingFormLink = "/team/insights-team/team-javascript";
    const organizationId = 5;
    const bookerEmail = `test-${uuid()}@example.com`;
    await embeds.gotoPlayground({
      calNamespace,
      url: `/embed/routing-playground.html?only=ns:${calNamespace}`,
    });
    await doOnOrgDomain(
      {
        orgSlug: "acme",
        page,
      },
      async ({ page }) => {
        await page.locator('input[name="name"]').pressSequentially("Test User", {
          delay: 100,
        });
        await page.locator('input[name="email"]').pressSequentially(bookerEmail, {
          delay: 100,
        });

        const prerenderedIframe = await expectPrerenderedIframe({
          page,
          calNamespace,
          calLink: expectedPreloadedLink,
          embeds,
        });
        // Wait for the /router request to be initiated within 500ms and completed within 5s
        const requestWaitPromise = page.waitForRequest(
          (request) => {
            console.log("request.url()", request.url());
            return request.url().includes("/api/router");
          },
          { timeout: 500 }
        );

        const responseWaitPromise = page.waitForResponse(
          (response) => response.url().includes("/api/router") && response.status() === 200,
          { timeout: 5000 }
        );
        await page.click(`[data-cal-namespace="${calNamespace}"]`);
        await Promise.all([requestWaitPromise, responseWaitPromise]);

        await expect(prerenderedIframe).waitForToBeEmbedCalLink({
          iframe: prerenderedIframe,
          calNamespace,
          getActionFiredDetails: embeds.getActionFiredDetails,
          expectedUrlDetails: {
            pathname: expectedRedirectFromRoutingFormLink,
            // Checking these params ensure that
            // 1. we are verifying the iframe path after successful redirect and not accidentally matching the preloaded path because preloaded path and after redirect path are same
            // 2. verifying that as per the data submitted we routed to correct team members
            searchParams: {
              "cal.orgId": `${organizationId}`,
              "cal.action": "eventTypeRedirectUrl",
              "cal.routedTeamMemberIds": "24,25,26",
            },
          },
          options: {
            waitForMs: 1000,
            checkIntervalMs: 500,
          },
        });

        const { uid: bookingId } = await bookEvent({ frame: prerenderedIframe, page });
        const booking = await getBooking(bookingId);

        // Two guests prefilled and one booker
        expect(booking.attendees.length).toBe(3);

        await deleteAllBookingsByEmail(bookerEmail);
      }
    );
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
  return prerenderedIframe;
}
