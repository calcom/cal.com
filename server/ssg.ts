import { createSSGHelpers } from "@trpc/react/ssg";

import prisma from "@lib/prisma";

import { appRouter } from "./routers/_app";

export const ssg = createSSGHelpers({
  router: appRouter,
  ctx: {
    prisma,
    localeProp: null,
    session: null,
    user: null,
  },
});
