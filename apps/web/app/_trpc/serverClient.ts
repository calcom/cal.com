import type { TRPCContext } from "@calcom/trpc/server/createContext";
import { appRouter } from "@calcom/trpc/server/routers/_app";

export const getServerCaller = (ctx: TRPCContext) => appRouter.createCaller(ctx);
