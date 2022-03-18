import { test as base } from "@playwright/test";
import { Server } from "http";
import { rest } from "msw";
import type { SetupServerApi } from "msw/node";

import { nextServer } from "./next-server";

const test = base.extend<{
  server: Server;
  requestInterceptor: SetupServerApi;
  rest: typeof rest;
}>({
  server: [
    async ({}, use) => {
      const server = await nextServer();
      await use(server);
      server.close();
    },
    {
      //@ts-ignore
      scope: "worker",
      auto: true,
    },
  ],
  requestInterceptor: [
    async ({}, use) => {
      // Import requestInterceptor from the built app so we
      // can attach attach our mocks to it from each test
      const { requestInterceptor } = require("../../.next/server/pages/_app");
      await use(requestInterceptor);
    },
    {
      //@ts-ignore
      scope: "worker",
    },
  ],
  rest,
});

export default test;
