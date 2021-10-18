import prisma from "@lib/prisma";

import { createSSGHelpers } from "@trpc/react/ssg";

import { appRouter } from "./routers/_app";

export const ssg = createSSGHelpers({
  router: appRouter,
  ctx: {
    prisma,
    session: null,
    user: null,
  },
});
