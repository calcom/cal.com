import { test } from "../lib/fixtures";

test.beforeEach(async ({ page, users, bookingPage }) => {
  const teamEventTitle = "Test Managed Event Type";
  const userFixture = await users.create(
    { name: "testuser" },
    { hasTeam: true, schedulingType: "MANAGED", teamEventTitle }
  );
  await userFixture.apiLogin();

  await page.goto("/event-types");
  await bookingPage.goToEventType(teamEventTitle);
  await page.getByTestId("location-select").click();
  await page.locator(`text="Cal Video (Global)"`).click();
  await bookingPage.goToTab("event_advanced_tab_title");
});

test.describe("Check advanced options in a managed team event type", () => {
  test("Check advanced options in a managed team event type without offer seats", async ({ bookingPage }) => {
    await bookingPage.checkRequiresConfirmation();
    await bookingPage.checkRequiresBookerEmailVerification();
    await bookingPage.checkHideNotes();
    await bookingPage.checkRedirectOnBooking();
    await bookingPage.checkLockTimezone();
    await bookingPage.updateEventType();
    await bookingPage.goToEventTypesPage();

    await bookingPage.checkEventType();
  });

  test("Check advanced options in a managed team event type with offer seats", async ({ bookingPage }) => {
    await bookingPage.checkRequiresConfirmation();
    await bookingPage.checkRequiresBookerEmailVerification();
    await bookingPage.checkHideNotes();
    await bookingPage.checkRedirectOnBooking();
    await bookingPage.toggleOfferSeats();
    await bookingPage.checkLockTimezone();
    await bookingPage.updateEventType();
    await bookingPage.goToEventTypesPage();

    await bookingPage.checkEventType();
  });
});
