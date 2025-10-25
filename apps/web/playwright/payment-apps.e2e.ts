import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

import prisma from "@calcom/prisma";

import { test } from "./lib/fixtures";
import { selectFirstAvailableTimeSlotNextMonth, submitAndWaitForResponse } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });
test.afterEach(({ users }) => users.deleteAll());

async function goToAppsTab(page: Page, eventTypeId?: number) {
  await page.goto(`event-types/${eventTypeId}?tabName=apps`);
  await expect(page.getByTestId("vertical-tab-apps")).toHaveAttribute("aria-current", "page");
}

test.describe("Payment app", () => {
  test("Should be able to edit alby price, currency", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();
    const paymentEvent = user.eventTypes.find((item) => item.slug === "paid");
    expect(paymentEvent).not.toBeNull();
    await prisma.credential.create({
      data: {
        type: "alby_payment",
        appId: "alby",
        userId: user.id,
        key: {
          account_id: "random",
          account_email: "random@example.com",
          webhook_endpoint_id: "ep_randomString",
          webhook_endpoint_secret: "whsec_randomString",
          account_lightning_address: "random@getalby.com",
        },
      },
    });

    await goToAppsTab(page, paymentEvent?.id);

    await page.locator("#event-type-form").getByRole("switch").click();
    await page.getByPlaceholder("Price").click();
    await page.getByPlaceholder("Price").fill("200");
    await page.getByText("SatoshissatsCurrencyBTCPayment optionCollect payment on booking").click();
    await submitAndWaitForResponse(page, "/api/trpc/eventTypesHeavy/update?batch=1", {
      action: () => page.locator("[data-testid=update-eventtype]").click(),
    });

    await page.goto(`${user.username}/${paymentEvent?.slug}`);

    // expect 200 sats to be displayed in page
    await expect(page.locator("text=200 sats").first()).toBeVisible();

    await selectFirstAvailableTimeSlotNextMonth(page);
    await expect(page.locator("text=200 sats").first()).toBeVisible();

    // go to /event-types and check if the price is 200 sats
    await page.goto(`event-types/`);
    await expect(page.locator("text=200 sats").first()).toBeVisible();
  });

  test("Should be able to edit stripe price, currency", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();
    const paymentEvent = user.eventTypes.find((item) => item.slug === "paid");
    expect(paymentEvent).not.toBeNull();
    await prisma.credential.create({
      data: {
        type: "stripe_payment",
        appId: "stripe",
        userId: user.id,
        key: {
          scope: "read_write",
          livemode: false,
          token_type: "bearer",
          access_token: "sk_test_randomString",
          refresh_token: "rt_randomString",
          stripe_user_id: "acct_randomString",
          default_currency: "usd",
          stripe_publishable_key: "pk_test_randomString",
        },
      },
    });

    await goToAppsTab(page, paymentEvent?.id);
    await page.locator("#event-type-form").getByRole("switch").click();
    await page.getByTestId("stripe-currency-select").click();
    await page.getByTestId("select-option-usd").click();

    await page.getByTestId("stripe-price-input").click();
    await page.getByTestId("stripe-price-input").fill("350");
    await page.getByTestId("update-eventtype").click();

    await page.goto(`${user.username}/${paymentEvent?.slug}`);

    // expect 200 sats to be displayed in page
    expect(await page.locator("text=350").first()).toBeTruthy();

    await selectFirstAvailableTimeSlotNextMonth(page);
    expect(await page.locator("text=350").first()).toBeTruthy();

    // go to /event-types and check if the price is 200 sats
    await page.goto(`event-types/`);
    expect(await page.locator("text=350").first()).toBeTruthy();
  });

  test("Should be able to edit paypal price, currency", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();
    const paymentEvent = user.eventTypes.find((item) => item.slug === "paid");
    expect(paymentEvent).not.toBeNull();
    await prisma.credential.create({
      data: {
        type: "paypal_payment",
        appId: "paypal",
        userId: user.id,
        key: {
          client_id: "randomString",
          secret_key: "randomString",
          webhook_id: "randomString",
        },
      },
    });

    await goToAppsTab(page, paymentEvent?.id);

    await page.locator("#event-type-form").getByRole("switch").click();

    await page.getByPlaceholder("Price").click();
    await page.getByPlaceholder("Price").fill("150");

    await page.getByTestId("paypal-currency-select").click();
    await page.getByTestId("select-option-MXN").click();

    await page.getByTestId("paypal-payment-option-select").click();

    await page.getByText("$MXNCurrencyMexican pesoPayment option").click();
    await page.getByTestId("update-eventtype").click();

    await page.goto(`${user.username}/${paymentEvent?.slug}`);

    // expect 150 to be displayed in page
    expect(await page.locator("text=MX$150.00").first()).toBeTruthy();

    await selectFirstAvailableTimeSlotNextMonth(page);
    // expect 150 to be displayed in page
    expect(await page.locator("text=MX$150.00").first()).toBeTruthy();

    // go to /event-types and check if the price is 150
    await page.goto(`event-types/`);
    expect(await page.locator("text=MX$150.00").first()).toBeTruthy();
  });

  test("Should display App is not setup already for alby", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();
    const paymentEvent = user.eventTypes.find((item) => item.slug === "paid");
    expect(paymentEvent).not.toBeNull();
    await prisma.credential.create({
      data: {
        type: "alby_payment",
        appId: "alby",
        userId: user.id,
        key: {},
      },
    });

    await goToAppsTab(page, paymentEvent?.id);

    await page.locator("#event-type-form").getByRole("switch").click();

    // expect text "This app has not been setup yet" to be displayed
    expect(await page.locator("text=This app has not been setup yet").first()).toBeTruthy();

    await page.getByRole("button", { name: "Setup" }).click();

    // Expect "Connect with Alby" to be displayed
    expect(await page.locator("text=Connect with Alby").first()).toBeTruthy();
  });

  test("Should display App is not setup already for paypal", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();
    const paymentEvent = user.eventTypes.find((item) => item.slug === "paid");
    expect(paymentEvent).not.toBeNull();
    await prisma.credential.create({
      data: {
        type: "paypal_payment",
        appId: "paypal",
        userId: user.id,
        key: {},
      },
    });

    await goToAppsTab(page, paymentEvent?.id);

    await page.locator("#event-type-form").getByRole("switch").click();

    // expect text "This app has not been setup yet" to be displayed
    expect(await page.locator("text=This app has not been setup yet").first()).toBeTruthy();

    await page.getByRole("button", { name: "Setup" }).click();

    // Expect "Getting started with Paypal APP" to be displayed
    expect(await page.locator("text=Getting started with Paypal APP").first()).toBeTruthy();
  });

  /**
   * For now almost all the payment apps show display "This app has not been setup yet"
   * this can change in the future
   */
  test("Should not display App is not setup already for non payment app", async ({ page, users }) => {
    // We will use google analytics app for this test
    const user = await users.create();
    await user.apiLogin();
    // Any event should work here
    const paymentEvent = user.eventTypes.find((item) => item.slug === "paid");
    expect(paymentEvent).not.toBeNull();

    await prisma.credential.create({
      data: {
        type: "ga4_analytics",
        userId: user.id,
        appId: "ga4",
        invalid: false,
        key: {},
      },
    });

    await goToAppsTab(page, paymentEvent?.id);

    await page.locator("#event-type-form").getByRole("switch").click();
    // make sure Tracking ID is displayed
    expect(await page.locator("text=Tracking ID").first()).toBeTruthy();
    await page.getByLabel("Tracking ID").click();
    await page.getByLabel("Tracking ID").fill("demo");
    await page.getByTestId("update-eventtype").click();
  });

  test("Should only be allowed to enable one payment app", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();
    const paymentEvent = user.eventTypes.find((item) => item.slug === "paid");
    if (!paymentEvent) {
      throw new Error("No payment event found");
    }
    await prisma.credential.createMany({
      data: [
        {
          type: "paypal_payment",
          appId: "paypal",
          userId: user.id,
          key: {
            client_id: "randomString",
            secret_key: "randomString",
            webhook_id: "randomString",
          },
        },
        {
          type: "stripe_payment",
          appId: "stripe",
          userId: user.id,
          key: {
            scope: "read_write",
            livemode: false,
            token_type: "bearer",
            access_token: "sk_test_randomString",
            refresh_token: "rt_randomString",
            stripe_user_id: "acct_randomString",
            default_currency: "usd",
            stripe_publishable_key: "pk_test_randomString",
          },
        },
      ],
    });

    await goToAppsTab(page, paymentEvent?.id);

    await page.locator("[data-testid='paypal-app-switch']").click();
    await page.locator("[data-testid='stripe-app-switch']").isDisabled();
  });

  test("when more than one payment app is installed the price should be updated when changing settings", async ({
    page,
    users,
  }) => {
    const user = await users.create();
    await user.apiLogin();
    const paymentEvent = user.eventTypes.find((item) => item.slug === "paid");
    if (!paymentEvent) {
      throw new Error("No payment event found");
    }

    await prisma.credential.createMany({
      data: [
        {
          type: "paypal_payment",
          appId: "paypal",
          userId: user.id,
          key: {
            client_id: "randomString",
            secret_key: "randomString",
            webhook_id: "randomString",
          },
        },
        {
          type: "stripe_payment",
          appId: "stripe",
          userId: user.id,
          key: {
            scope: "read_write",
            livemode: false,
            token_type: "bearer",
            access_token: "sk_test_randomString",
            refresh_token: "rt_randomString",
            stripe_user_id: "acct_randomString",
            default_currency: "usd",
            stripe_publishable_key: "pk_test_randomString",
          },
        },
      ],
    });

    await goToAppsTab(page, paymentEvent?.id);

    await page.getByTestId("paypal-app-switch").click();
    await page.getByTestId("paypal-price-input").fill("100");
    await page.getByTestId("paypal-currency-select").first().click();
    await page.getByTestId("select-option-MXN").click();
    // await page.locator(".mb-1 > .bg-default > div > div:nth-child(2)").first().click();
    // await page.getByText("$MXNCurrencyMexican pesoPayment option").click();
    await page.getByTestId("update-eventtype").click();

    // Need to wait for the DB to be updated
    await page.waitForResponse((res) => res.url().includes("update") && res.status() === 200);

    const paypalPrice = await prisma.eventType.findFirst({
      where: {
        id: paymentEvent.id,
      },
      select: {
        price: true,
      },
    });

    expect(paypalPrice?.price).toEqual(10000);

    await page.getByTestId("paypal-app-switch").click();
    await page.getByTestId("stripe-app-switch").click();
    await page.getByTestId("stripe-price-input").fill("200");
    await page.getByTestId("update-eventtype").click();

    // Need to wait for the DB to be updated
    await page.waitForResponse((res) => res.url().includes("update") && res.status() === 200);

    const stripePrice = await prisma.eventType.findFirst({
      where: {
        id: paymentEvent.id,
      },
      select: {
        price: true,
      },
    });

    expect(stripePrice?.price).toEqual(20000);
  });
});
