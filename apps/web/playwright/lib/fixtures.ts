import type { Page } from "@playwright/test";
import { test as base } from "@playwright/test";
import type { API } from "mailhog";
import mailhog from "mailhog";

import { IS_MAILHOG_ENABLED } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

import type { ExpectedUrlDetails } from "../../../../playwright.config";
import { createBookingsFixture } from "../fixtures/bookings";
import { createEmbedsFixture, createGetActionFiredDetails } from "../fixtures/embeds";
import { createPaymentsFixture } from "../fixtures/payments";
import { createRoutingFormsFixture } from "../fixtures/routingForms";
import { createServersFixture } from "../fixtures/servers";
import { createUsersFixture } from "../fixtures/users";

export interface Fixtures {
  page: Page;
  users: ReturnType<typeof createUsersFixture>;
  bookings: ReturnType<typeof createBookingsFixture>;
  payments: ReturnType<typeof createPaymentsFixture>;
  addEmbedListeners: ReturnType<typeof createEmbedsFixture>;
  getActionFiredDetails: ReturnType<typeof createGetActionFiredDetails>;
  servers: ReturnType<typeof createServersFixture>;
  prisma: typeof prisma;
  emails?: API;
  routingForms: ReturnType<typeof createRoutingFormsFixture>;
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
        expectedUrlDetails?: ExpectedUrlDetails
      ): Promise<R>;
    }
  }
}

/**
 *  @see https://playwright.dev/docs/test-fixtures
 */
export const test = base.extend<Fixtures>({
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
  addEmbedListeners: async ({ page }, use) => {
    const embedsFixture = createEmbedsFixture(page);
    await use(embedsFixture);
  },
  getActionFiredDetails: async ({ page }, use) => {
    const getActionFiredDetailsFixture = createGetActionFiredDetails(page);
    await use(getActionFiredDetailsFixture);
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
      await use(undefined);
    }
  },
});
