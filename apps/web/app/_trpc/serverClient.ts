import { appRouter } from "@calcom/trpc/server/routers/_app";

export const serverClient = appRouter.createCaller({});
