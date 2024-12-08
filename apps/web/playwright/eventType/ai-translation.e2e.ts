import { expect } from "@playwright/test";
import { loginUser } from "playwright/fixtures/regularBookings";
import { createNewEventType } from "playwright/lib/testUtils";

import { MembershipRole } from "@calcom/prisma/enums";

import { test } from "../lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.describe("AI Translation - Event Type @test", () => {
  test("Toggle should not be clickable for free plan members", async ({ page, users, bookingPage }) => {
    await loginUser(users);
    await page.goto("/event-types");
    await bookingPage.goToEventType("30 min");
    expect(await bookingPage.getAITranslationToggleDisabled()).toBe(true);
  });

  test("Toggle should not be clickable for team plan members", async ({ page, users, bookingPage }) => {
    const pro = await users.create(
      { name: "testuser" },
      {
        hasTeam: true,
        teamRole: MembershipRole.MEMBER,
      }
    );
    await pro.apiLogin();
    await page.goto("/event-types");
    await bookingPage.goToEventType("30 min");
    expect(await bookingPage.getAITranslationToggleDisabled()).toBe(true);
  });

  test("Toggle should be clickable for org members", async ({ page, users, bookingPage }) => {
    const pro = await users.create(
      { name: "testuser" },
      {
        isOrg: true,
        hasTeam: true,
        teamRole: MembershipRole.MEMBER,
      }
    );
    await pro.apiLogin();
    await page.goto("/event-types");
    await createNewEventType(page, { eventTitle: "5 min" });
    expect(await bookingPage.getAITranslationToggleDisabled()).toBe(false);
  });

  test("Enable the AI translation and test in booking page", async ({ page, users, bookingPage }) => {
    const pro = await users.create(
      { name: "testuser" },
      {
        isOrg: true,
        hasTeam: true,
        teamRole: MembershipRole.MEMBER,
      }
    );
    await pro.apiLogin();
    await page.goto("/event-types");
    await createNewEventType(page, { eventTitle: "5 min", eventDescription: "A quick 5 minute chat." });
    expect(await bookingPage.getAITranslationToggleDisabled()).toBe(false);
    await bookingPage.toggleAITranslation();
    await bookingPage.updateEventType();
  });
});
