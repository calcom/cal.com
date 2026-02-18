import { expect } from "@playwright/test";

import { SchedulingType } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";

const TIMEOUT = 15000;

test.describe("Instant Meeting", () => {
  test("waiting modal appears after instant booking", async ({ page, users }) => {
    const owner = await users.create(
      { name: "instant-owner" },
      {
        hasTeam: true,
        teammates: [{ name: "teammate-1" }],
        schedulingType: SchedulingType.ROUND_ROBIN,
        isInstantEvent: true,
      }
    );

    const { team } = await owner.getFirstTeamMembership();
    const teamEvent = await owner.getFirstTeamEvent(team.id);

    await page.route("**/api/book/instant-event", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          bookingId: 999,
          bookingUid: "test-instant-uid",
          meetingTokenId: 1,
          expires: new Date(Date.now() + 90000).toISOString(),
          message: "Success",
        }),
      });
    });

    // Go to the team event page (non-instant) and click "Connect now"
    await page.goto(`/team/${team.slug}/${teamEvent.slug}`);

    const connectNowButton = page.getByRole("button", { name: "Connect now" });
    await expect(connectNowButton).toBeVisible({ timeout: TIMEOUT });
    await connectNowButton.click();

    // After clicking "Connect now", the page reloads with ?isInstantMeeting=true
    // and auto-selects the current timeslot, showing the booking form.
    const nameField = page.locator('[name="name"]');
    await nameField.waitFor({ state: "visible", timeout: TIMEOUT });
    await nameField.fill("Test User");
    await page.locator('[name="email"]').fill("test@example.com");

    const confirmButton = page.getByRole("button", { name: "Confirm" });
    await expect(confirmButton).toBeEnabled({ timeout: TIMEOUT });
    await confirmButton.click();

    await expect(page.getByText("Please do not close or refresh this page")).toBeVisible({ timeout: 10000 });

    // Navigate away to stop the polling before cleanup
    await page.goto("about:blank");
  });
});
