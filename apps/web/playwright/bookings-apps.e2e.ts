import { WEBAPP_URL } from "@calcom/lib/constants";

import { loginUser } from "./fixtures/regularBookings";
import type { Fixtures } from "./lib/fixtures";
import { test } from "./lib/fixtures";

const goToApps = async (
  page: Fixtures["page"],
  users: Fixtures["users"],
  bookingPage: Fixtures["bookingPage"]
) => {
  await loginUser(users);
  await page.goto(`${WEBAPP_URL}/event-types`);
  await bookingPage.goToEventType("30 min");
  await bookingPage.goToTab("apps");
};
const trackingId = "XXXXXXXXXX";

test.describe("Qr code", async () => {
  test.beforeEach(({ users }) => users.deleteAll());
  test("Install Qr code app and check the generated result", async ({ page, users, bookingPage }) => {
    await goToApps(page, users, bookingPage);
    await bookingPage.installRecommendedApp("qr_code");
    await bookingPage.fillQrCodeUrlParameters({ fillText: "test=test", users });
  });
});

test.describe("Giphy", async () => {
  test.beforeEach(({ users }) => users.deleteAll());

  test("Install Giphy app and add a gif from search", async ({ page, users, bookingPage }) => {
    await goToApps(page, users, bookingPage);
    await bookingPage.installRecommendedApp("giphy");
    await bookingPage.addGifFromSearch("test");
    await bookingPage.assertSelectedGif();
  });

  test("Install Giphy app and add a gif from link", async ({ page, users, bookingPage }) => {
    await goToApps(page, users, bookingPage);
    await bookingPage.installRecommendedApp("giphy");
    await bookingPage.addGifFromLink("https://media.giphy.com/media/2tgkWwcDBISej0C5Vg/giphy.gif");
    await bookingPage.assertSelectedGif();
  });
});

test.describe("Google Analytics", async () => {
  test.beforeEach(({ users }) => users.deleteAll());
  test("Install Google Analytics app and check if the tracking ID is used", async ({
    page,
    users,
    bookingPage,
  }) => {
    await goToApps(page, users, bookingPage);
    await bookingPage.installRecommendedApp("ga4");
    await bookingPage.fillAppTrackingId(trackingId);
    await bookingPage.updateEventType();
    const eventTypePage = await bookingPage.previewEventType();
    await bookingPage.assertGoogleAnalyticsRequest(eventTypePage, trackingId);
  });

  test("Install Google Tag Manager app and check if the tracking ID is used", async ({
    page,
    users,
    bookingPage,
  }) => {
    await goToApps(page, users, bookingPage);
    await bookingPage.installRecommendedApp("gtm");
    await bookingPage.fillAppTrackingId(trackingId);
    await bookingPage.updateEventType();
    const eventTypePage = await bookingPage.previewEventType();
    await bookingPage.assertGoogleTagRequest(eventTypePage, trackingId);
  });
});

test.describe("Plausible Analytics", async () => {
  test.beforeEach(({ users }) => users.deleteAll());
  test("Install Plausible Analytics app and check if the data provided is used", async ({
    page,
    users,
    bookingPage,
  }) => {
    await goToApps(page, users, bookingPage);
    await bookingPage.installRecommendedApp("plausible");
    await bookingPage.fillPlausibleAppForm(users);
    await bookingPage.updateEventType();
    const eventTypePage = await bookingPage.previewEventType();
    await bookingPage.assertPlausibleAnalyticsRequest(eventTypePage, users);
  });
});

test.describe("Fathom Analytics", async () => {
  test.beforeEach(({ users }) => users.deleteAll());
  test("Install Fathom Analytics app and check if the tracking ID is used", async ({
    page,
    users,
    bookingPage,
  }) => {
    await goToApps(page, users, bookingPage);
    await bookingPage.installRecommendedApp("fathom");
    await bookingPage.fillAppTrackingId(trackingId);
    await bookingPage.updateEventType();

    const eventTypePage = await bookingPage.previewEventType();
    await bookingPage.assertFathomAnalyticsRequest(eventTypePage, users, trackingId);
  });
});

test.describe("Meta Pixel", async () => {
  test.beforeEach(({ users }) => users.deleteAll());
  test("Install Meta Pixel app and check if the Pixel ID is used", async ({ page, users, bookingPage }) => {
    await goToApps(page, users, bookingPage);
    await bookingPage.installRecommendedApp("metapixel");
    await bookingPage.fillAppTrackingId(trackingId, "Pixel ID");
    await bookingPage.updateEventType();

    const eventTypePage = await bookingPage.previewEventType();
    await bookingPage.assertMetaPixelRequest(eventTypePage);
  });
});
