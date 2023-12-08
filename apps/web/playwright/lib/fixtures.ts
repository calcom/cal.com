import type { Page } from "@playwright/test";
import { test as base } from "@playwright/test";
import type { API } from "mailhog";
import mailhog from "mailhog";

import { IS_MAILHOG_ENABLED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

import type { ExpectedUrlDetails } from "../../../../playwright.config";
import { createBookingsFixture } from "../fixtures/bookings";
import { createEmbedsFixture } from "../fixtures/embeds";
import { createFeatureFixture } from "../fixtures/features";
import { createOrgsFixture } from "../fixtures/orgs";
import { createPaymentsFixture } from "../fixtures/payments";
import { createBookingPageFixture } from "../fixtures/regularBookings";
import { createRoutingFormsFixture } from "../fixtures/routingForms";
import { createServersFixture } from "../fixtures/servers";
import { createUsersFixture } from "../fixtures/users";

export interface Fixtures {
  page: Page;
  orgs: ReturnType<typeof createOrgsFixture>;
  users: ReturnType<typeof createUsersFixture>;
  bookings: ReturnType<typeof createBookingsFixture>;
  payments: ReturnType<typeof createPaymentsFixture>;
  embeds: ReturnType<typeof createEmbedsFixture>;
  servers: ReturnType<typeof createServersFixture>;
  prisma: typeof prisma;
  emails?: API;
  routingForms: ReturnType<typeof createRoutingFormsFixture>;
  bookingPage: ReturnType<typeof createBookingPageFixture>;
  features: ReturnType<typeof createFeatureFixture>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace PlaywrightTest {
    //FIXME: how to restrict it to Frame only
    interface Matchers<R> {
      toBeEmbedCalLink(
        calNamespace: string,
        // eslint-disable-next-line
        getActionFiredDetails: (a: { calNamespace: string; actionType: string }) => Promise<any>,
        expectedUrlDetails?: ExpectedUrlDetails,
        isPrendered?: boolean
      ): Promise<R>;
    }
  }
}

/**
 *  @see https://playwright.dev/docs/test-fixtures
 */
export const test = base.extend<Fixtures>({
  orgs: async ({ page }, use) => {
    const orgsFixture = createOrgsFixture(page);
    await use(orgsFixture);
  },
  users: async ({ page, context, emails }, use, workerInfo) => {
    const usersFixture = createUsersFixture(page, emails, workerInfo);
    await use(usersFixture);
  },
  bookings: async ({ page }, use) => {
    const bookingsFixture = createBookingsFixture(page);
    await use(bookingsFixture);
  },
  payments: async ({ page }, use) => {
    const payemntsFixture = createPaymentsFixture(page);
    await use(payemntsFixture);
  },
  embeds: async ({ page }, use) => {
    const embedsFixture = createEmbedsFixture(page);
    await use(embedsFixture);
  },
  servers: async ({}, use) => {
    const servers = createServersFixture();
    await use(servers);
  },
  prisma: async ({}, use) => {
    await use(prisma);
  },
  routingForms: async ({}, use) => {
    await use(createRoutingFormsFixture());
  },
  emails: async ({}, use) => {
    if (IS_MAILHOG_ENABLED) {
      const mailhogAPI = mailhog();
      await use(mailhogAPI);
    } else {
      //FIXME: Ideally we should error out here. If someone is running tests with mailhog disabled, they should be aware of it
      logger.warn("Mailhog is not enabled - Skipping Emails verification");
      await use(undefined);
    }
  },
  bookingPage: async ({ page }, use) => {
    const bookingPage = createBookingPageFixture(page);
    await use(bookingPage);
  },
  features: async ({ page }, use) => {
    const features = createFeatureFixture(page);
    await features.init();
    await use(features);
  },
});
