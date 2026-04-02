import prisma from "@calcom/prisma";
import type { Page } from "@playwright/test";
import { test as base } from "@playwright/test";
// eslint-disable-next-line no-restricted-imports
import { noop } from "lodash";
import type { ExpectedUrlDetails } from "../../../../playwright.config";
import { createAppsFixture } from "../fixtures/apps";
import { createBookingsFixture } from "../fixtures/bookings";
import { createEmailsFixture } from "../fixtures/emails";
import { createEmbedsFixture } from "../fixtures/embeds";
import { createEventTypeFixture } from "../fixtures/eventTypes";
import { createFeatureFixture } from "../fixtures/features";
import { createOrgsFixture } from "../fixtures/orgs";
import { createPaymentsFixture } from "../fixtures/payments";
import { createBookingPageFixture } from "../fixtures/regularBookings";
import { createRoutingFormsFixture } from "../fixtures/routingForms";
import { createServersFixture } from "../fixtures/servers";
import { createUsersFixture } from "../fixtures/users";
import { createWebhookPageFixture } from "../fixtures/webhooks";
import { createWorkflowPageFixture } from "../fixtures/workflows";

export interface Fixtures {
  page: Page;
  orgs: ReturnType<typeof createOrgsFixture>;
  users: ReturnType<typeof createUsersFixture>;
  bookings: ReturnType<typeof createBookingsFixture>;
  payments: ReturnType<typeof createPaymentsFixture>;
  embeds: ReturnType<typeof createEmbedsFixture>;
  servers: ReturnType<typeof createServersFixture>;
  prisma: typeof prisma;
  emails: ReturnType<typeof createEmailsFixture>;
  routingForms: ReturnType<typeof createRoutingFormsFixture>;
  bookingPage: ReturnType<typeof createBookingPageFixture>;
  workflowPage: ReturnType<typeof createWorkflowPageFixture>;
  features: ReturnType<typeof createFeatureFixture>;
  eventTypePage: ReturnType<typeof createEventTypeFixture>;
  appsPage: ReturnType<typeof createAppsFixture>;
  webhooks: ReturnType<typeof createWebhookPageFixture>;
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
  bookings: async ({ page }, use, workerInfo) => {
    const bookingsFixture = createBookingsFixture(page, workerInfo);
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
    await use(createEmailsFixture());
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
  workflowPage: async ({ page }, use) => {
    const workflowPage = createWorkflowPageFixture(page);
    await use(workflowPage);
  },
  eventTypePage: async ({ page }, use) => {
    const eventTypePage = createEventTypeFixture(page);
    await use(eventTypePage);
  },
  appsPage: async ({ page }, use) => {
    const appsPage = createAppsFixture(page);
    await use(appsPage);
  },
  webhooks: async ({ page }, use) => {
    const webhooks = createWebhookPageFixture(page);
    await use(webhooks);
  },
});

export function todo(title: string) {
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip(title, noop);
}
