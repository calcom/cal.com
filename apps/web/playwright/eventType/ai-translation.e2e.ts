import { MembershipRole } from "@calcom/prisma/enums";
import { expect } from "@playwright/test";
import { loginUser } from "playwright/fixtures/regularBookings";
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
