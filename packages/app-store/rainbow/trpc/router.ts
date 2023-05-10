import { router, publicProcedure } from "@calcom/trpc/server/trpc";

import { ZBalanceInputSchema, ZBalanceOutputSchema } from "./balance.schema";
import { ZContractInputSchema, ZContractOutputSchema } from "./contract.schema";

interface EthRouterHandlersCache {
  contract?: typeof import("./contract.handler").contractHandler;
  balance?: typeof import("./balance.handler").balanceHandler;
}

const UNSTABLE_HANDLER_CACHE: EthRouterHandlersCache = {};

const ethRouter = router({
  // Fetch contract `name` and `symbol` or error
  contract: publicProcedure
    .input(ZContractInputSchema)
    .output(ZContractOutputSchema)
    .query(async ({ input }) => {
      if (!UNSTABLE_HANDLER_CACHE.contract) {
        UNSTABLE_HANDLER_CACHE.contract = await import("./contract.handler").then(
          (mod) => mod.contractHandler
        );
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.contract) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.contract({
        input,
      });
    }),
  // Fetch user's `balance` of either ERC-20 or ERC-721 compliant token or error
  balance: publicProcedure
    .input(ZBalanceInputSchema)
    .output(ZBalanceOutputSchema)
    .query(async ({ input }) => {
      if (!UNSTABLE_HANDLER_CACHE.balance) {
        UNSTABLE_HANDLER_CACHE.balance = await import("./balance.handler").then((mod) => mod.balanceHandler);
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.balance) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.balance({
        input,
      });
    }),
});

export default ethRouter;
