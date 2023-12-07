import { expect } from "@playwright/test";
import type Prisma from "@prisma/client";

import prisma from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import { test } from "./lib/fixtures";
import type { Fixtures } from "./lib/fixtures";
import { todo, selectFirstAvailableTimeSlotNextMonth } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });
test.afterEach(({ users }) => users.deleteAll());

const IS_STRIPE_ENABLED = !!(
  process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY &&
  process.env.STRIPE_CLIENT_ID &&
  process.env.STRIPE_PRIVATE_KEY &&
  process.env.PAYMENT_FEE_FIXED &&
  process.env.PAYMENT_FEE_PERCENTAGE
);

test.describe("Stripe integration", () => {
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip(!IS_STRIPE_ENABLED, "It should only run if Stripe is installed");

  test.describe("Stripe integration dashboard", () => {
    test("Can add Stripe integration", async ({ page, users }) => {
      const user = await users.create();
      await user.apiLogin();
      await page.goto("/apps/installed");

      await user.getPaymentCredential();

      await expect(page.locator(`h3:has-text("Stripe")`)).toBeVisible();
      await page.getByRole("list").getByRole("button").click();
      await expect(page.getByRole("button", { name: "Remove App" })).toBeVisible();
    });
  });

  test("when enabling Stripe, credentialId is included", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();
    await page.goto("/apps/installed");

    await user.getPaymentCredential();

    const eventType = user.eventTypes.find((e) => e.slug === "paid") as Prisma.EventType;
    await user.setupEventWithPrice(eventType);

    // Need to wait for the DB to be updated with the metadata
    await page.waitForResponse((res) => res.url().includes("update") && res.status() === 200);

    // Check event type metadata to see if credentialId is included
    const eventTypeMetadata = await prisma.eventType.findFirst({
      where: {
        id: eventType.id,
      },
      select: {
        metadata: true,
      },
    });

    const metadata = EventTypeMetaDataSchema.parse(eventTypeMetadata?.metadata);

    const stripeAppMetadata = metadata?.apps?.stripe;

    expect(stripeAppMetadata).toHaveProperty("credentialId");
    expect(typeof stripeAppMetadata?.credentialId).toBe("number");
  });

  test("when enabling Stripe, team credentialId is included", async ({ page, users }) => {
    const ownerObj = { username: "pro-user", name: "pro-user" };
    const teamMatesObj = [
      { name: "teammate-1" },
      { name: "teammate-2" },
      { name: "teammate-3" },
      { name: "teammate-4" },
    ];

    const owner = await users.create(ownerObj, {
      hasTeam: true,
      teammates: teamMatesObj,
      schedulingType: SchedulingType.COLLECTIVE,
    });
    await owner.apiLogin();
    const { team } = await owner.getFirstTeam();
    const { title: teamEventTitle, slug: teamEventSlug } = await owner.getFirstTeamEvent(team.id);

    const teamEvent = await owner.getFirstTeamEvent(team.id);

    await page.goto("/apps/stripe");

    /** We start the Stripe flow */
    await Promise.all([
      page.waitForURL("https://connect.stripe.com/oauth/v2/authorize?*"),
      page.click('[data-testid="install-app-button"]'),
      page.click('[data-testid="anything else"]'),
    ]);

    await Promise.all([
      page.waitForURL("/apps/installed/payment?hl=stripe"),
      /** We skip filling Stripe forms (testing mode only) */
      page.click('[id="skip-account-app"]'),
    ]);

    await owner.setupEventWithPrice(teamEvent);

    // Need to wait for the DB to be updated with the metadata
    await page.waitForResponse((res) => res.url().includes("update") && res.status() === 200);

    // Check event type metadata to see if credentialId is included
    const eventTypeMetadata = await prisma.eventType.findFirst({
      where: {
        id: teamEvent.id,
      },
      select: {
        metadata: true,
      },
    });

    const metadata = EventTypeMetaDataSchema.parse(eventTypeMetadata?.metadata);

    const stripeAppMetadata = metadata?.apps?.stripe;

    expect(stripeAppMetadata).toHaveProperty("credentialId");
    expect(typeof stripeAppMetadata?.credentialId).toBe("number");
  });

  test("Can book a paid booking", async ({ page, users }) => {
    const user = await users.create();
    const eventType = user.eventTypes.find((e) => e.slug === "paid") as Prisma.EventType;
    await user.apiLogin();
    await page.goto("/apps/installed");

    await user.getPaymentCredential();
    await user.setupEventWithPrice(eventType);
    await user.bookAndPayEvent(eventType);
    // success
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();
  });

  test("Pending payment booking should not be confirmed by default", async ({ page, users }) => {
    const user = await users.create();
    const eventType = user.eventTypes.find((e) => e.slug === "paid") as Prisma.EventType;
    await user.apiLogin();
    await page.goto("/apps/installed");

    await user.getPaymentCredential();
    await user.setupEventWithPrice(eventType);

    // booking process without payment
    await page.goto(`${user.username}/${eventType?.slug}`);
    await selectFirstAvailableTimeSlotNextMonth(page);
    // --- fill form
    await page.fill('[name="name"]', "Stripe Stripeson");
    await page.fill('[name="email"]', "test@example.com");

    await Promise.all([page.waitForURL("/payment/*"), page.press('[name="email"]', "Enter")]);

    await page.goto(`/bookings/upcoming`);

    await expect(page.getByText("Unconfirmed")).toBeVisible();
    await expect(page.getByText("Pending payment").last()).toBeVisible();
  });

  test("Paid booking should be able to be rescheduled", async ({ page, users }) => {
    const user = await users.create();
    const eventType = user.eventTypes.find((e) => e.slug === "paid") as Prisma.EventType;
    await user.apiLogin();
    await page.goto("/apps/installed");

    await user.getPaymentCredential();
    await user.setupEventWithPrice(eventType);
    await user.bookAndPayEvent(eventType);

    // Rescheduling the event
    await Promise.all([page.waitForURL("/booking/*"), page.click('[data-testid="reschedule-link"]')]);

    await selectFirstAvailableTimeSlotNextMonth(page);

    await Promise.all([
      page.waitForURL("/payment/*"),
      page.click('[data-testid="confirm-reschedule-button"]'),
    ]);

    await user.makePaymentUsingStripe();
  });

  test("Paid booking should be able to be cancelled", async ({ page, users }) => {
    const user = await users.create();
    const eventType = user.eventTypes.find((e) => e.slug === "paid") as Prisma.EventType;
    await user.apiLogin();
    await page.goto("/apps/installed");

    await user.getPaymentCredential();
    await user.setupEventWithPrice(eventType);
    await user.bookAndPayEvent(eventType);

    await page.click('[data-testid="cancel"]');
    await page.click('[data-testid="confirm_cancel"]');

    await expect(await page.locator('[data-testid="cancelled-headline"]').first()).toBeVisible();
  });

  test.describe("When event is paid and confirmed", () => {
    let user: Awaited<ReturnType<Fixtures["users"]["create"]>>;
    let eventType: Prisma.EventType;

    test.beforeEach(async ({ page, users }) => {
      user = await users.create();
      eventType = user.eventTypes.find((e) => e.slug === "paid") as Prisma.EventType;
      await user.apiLogin();
      await page.goto("/apps/installed");

      await user.getPaymentCredential();
      await user.setupEventWithPrice(eventType);
      await user.bookAndPayEvent(eventType);
      await user.confirmPendingPayment();
    });

    test("Cancelled paid booking should be refunded", async ({ page, users, request }) => {
      await page.click('[data-testid="cancel"]');
      await page.click('[data-testid="confirm_cancel"]');

      await expect(await page.locator('[data-testid="cancelled-headline"]').first()).toBeVisible();
      await expect(page.getByText("This booking payment has been refunded")).toBeVisible();
    });

    test("Payment should confirm pending payment booking", async ({ page, users }) => {
      await page.goto("/bookings/upcoming");

      const paidBadge = page.locator('[data-testid="paid_badge"]').first();

      await expect(paidBadge).toBeVisible();
      expect(await paidBadge.innerText()).toBe("Paid");
    });

    test("Paid and confirmed booking should be able to be rescheduled", async ({ page, users }) => {
      await Promise.all([page.waitForURL("/booking/*"), page.click('[data-testid="reschedule-link"]')]);

      await selectFirstAvailableTimeSlotNextMonth(page);

      await page.click('[data-testid="confirm-reschedule-button"]');

      await expect(page.getByText("This meeting is scheduled")).toBeVisible();
    });

    todo("Payment should trigger a BOOKING_PAID webhook");
  });

  test.describe("Change stripe presented currency", () => {
    test("Should be able to change currency", async ({ page, users }) => {
      const user = await users.create();
      const eventType = user.eventTypes.find((e) => e.slug === "paid") as Prisma.EventType;
      await user.apiLogin();

      await user.getPaymentCredential();

      // Edit currency inside event type page
      await page.goto(`/event-types/${eventType?.id}?tabName=apps`);

      // Enable Stripe
      await page.locator("#event-type-form").getByRole("switch").click();

      // Set price
      await page.getByTestId("price-input-stripe").fill("200");

      // Select currency in dropdown
      await page.getByTestId("stripe-currency-select").click();
      await page.locator("#react-select-2-input").fill("mexi");
      await page.locator("#react-select-2-option-81").click();

      await page.getByTestId("update-eventtype").click();

      // Book event
      await page.goto(`${user.username}/${eventType?.slug}`);

      // Confirm MXN currency it's displayed use expect
      await expect(await page.getByText("MX$200.00")).toBeVisible();

      await selectFirstAvailableTimeSlotNextMonth(page);

      // Confirm again in book form page
      await expect(await page.getByText("MX$200.00")).toBeVisible();

      // --- fill form
      await page.fill('[name="name"]', "Stripe Stripeson");
      await page.fill('[name="email"]', "stripe@example.com");

      // Confirm booking
      await page.click('[data-testid="confirm-book-button"]');

      // wait for url to be payment
      await page.waitForURL("/payment/*");

      // Confirm again in book form page
      await expect(await page.getByText("MX$200.00")).toBeVisible();
    });
  });
});
