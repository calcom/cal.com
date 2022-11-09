import z from "zod";

import { getLocalAppMetadata } from "@calcom/app-store/utils";

import { createProtectedRouter } from "../../createRouter";

export const appsRouter = createProtectedRouter().query("listLocal", {
  input: z.object({
    variant: z.string(),
  }),
  async resolve({ ctx, input }) {
    const allApps = getLocalAppMetadata();

    const filteredApps = allApps.filter((app) => app.variant === input.variant);
    return filteredApps;
  },
});
