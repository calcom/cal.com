import { expect } from "@playwright/test";
import { loginUser } from "playwright/fixtures/regularBookings";
import { setupOrgMember, createNewUserEventType } from "playwright/lib/testUtils";

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
});

test.describe("AI Translation - Booking Page", () => {
  test.use({
    locale: "ko-KR",
  });
  test("Enable the AI translation and test in browser in Korean (ko-KR)", async ({
    page,
    users,
    bookingPage,
  }) => {
    const { orgMember, org } = await setupOrgMember(users);

    await page.goto("/event-types");
    await createNewUserEventType(page, {
      eventTitle: "5 min",
      username: orgMember.username ?? undefined,
    });
    expect(await bookingPage.getAITranslationToggleDisabled()).toBe(false);
    await bookingPage.toggleAITranslation();
    await bookingPage.updateEventTypeDescription("A quick 5 minute chat.");
    await bookingPage.updateEventType();
    await orgMember.logout(); // logging out because user locale overrides the browser locale otherwise
    await page.goto(`/${orgMember.username}/5-min`);
    await expect(page.locator('[data-testid="event-meta-description"] p')).toHaveText("빠른 5분 대화.");
  });
});
