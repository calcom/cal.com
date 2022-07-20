import { test as base } from "@playwright/test";
import { Server } from "http";
import { rest } from "msw";
import type { SetupServerApi } from "msw/node";

import { nextServer } from "../../playwright-integrations/next-server";
import { createBookingsFixture } from "../../playwright/fixtures/bookings";
import { createPaymentsFixture } from "../../playwright/fixtures/payments";
import { createUsersFixture } from "../../playwright/fixtures/users";

interface Fixtures {
  users: ReturnType<typeof createUsersFixture>;
  bookings: ReturnType<typeof createBookingsFixture>;
  payments: ReturnType<typeof createPaymentsFixture>;
  server: Server;
  requestInterceptor: SetupServerApi;
  rest: typeof rest;
}

/**
 *  @see https://playwright.dev/docs/test-fixtures
 */
export const test = base.extend<Fixtures>({
  users: async ({ page }, use, workerInfo) => {
    const usersFixture = createUsersFixture(page, workerInfo);
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
  // This fixture runs for each worker, ensuring that every worker starts it's own Next.js instance on which we can attach MSW
  // A single worker can run many tests
  server: [
    async ({}, use) => {
      const server = await nextServer();
      await use(server);
      server.close();
    },
    {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      scope: "worker",
      auto: true,
    },
  ],
});
