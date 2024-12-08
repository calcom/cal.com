import { expect } from "@playwright/test";
import { loginUser } from "playwright/fixtures/regularBookings";
import { createNewEventType, doOnOrgDomain } from "playwright/lib/testUtils";

import { MembershipRole } from "@calcom/prisma/enums";

import { test } from "../lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.describe("AI Translation - Event Type", () => {
  test("Toggle should not be clickable for free plan members", async ({ page, users, bookingPage }) => {
    await loginUser(users);
    await page.goto("/event-types");
    await bookingPage.goToEventType("30 min");
    expect(await bookingPage.getAITranslationToggleDisabled()).toBe(true);
  });

  test("Toggle should not be clickable for team plan members", async ({ page, users, bookingPage }) => {
    const user = await users.create(
      { name: "testuser" },
      {
        hasTeam: true,
        teamRole: MembershipRole.MEMBER,
      }
    );
    await user.apiLogin();
    await page.goto("/event-types");
    await bookingPage.goToEventType("30 min");
    expect(await bookingPage.getAITranslationToggleDisabled()).toBe(true);
  });

  test("Toggle should be clickable for org members", async ({ page, orgs, users, bookingPage }) => {
    const org = await orgs.create({
      name: "acme",
    });
    const user = await users.create({
      organizationId: org.id,
      roleInOrganization: MembershipRole.MEMBER,
    });
    await user.apiLogin();
    await page.goto("/event-types");
    await bookingPage.goToEventType("30 min");
    expect(await bookingPage.getAITranslationToggleDisabled()).toBe(false);
  });

  test("Enable the AI translation and test in booking page", async ({
    page,
    orgs,
    users,
    bookingPage,
    context,
  }) => {
    const org = await orgs.create({
      name: "acme",
    });
    const user = await users.create({
      organizationId: org.id,
      roleInOrganization: MembershipRole.MEMBER,
    });
    await user.apiLogin();
    await page.goto("/event-types");
    await createNewEventType(page, { eventTitle: "5 min", eventDescription: "A quick 5 minute chat." });
    expect(await bookingPage.getAITranslationToggleDisabled()).toBe(false);
    await bookingPage.toggleAITranslation();
    await bookingPage.updateEventType();

    await user.logout();
    await context.setExtraHTTPHeaders({
      "Accept-Language": "ko-KR",
    });
    await doOnOrgDomain(
      {
        orgSlug: org.slug,
        page,
      },
      async () => {
        await page.goto("/5-min");
        await expect(page.locator('[data-testid="event-meta-description"] p')).toHaveText("빠른 5분 대화.");
      }
    );
  });
});
