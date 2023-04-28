/**
 * This file contains tRPC's HTTP response handler
 */
import * as trpcNext from "@calcom/trpc/server/adapters/next";
import { createContext as createTrpcContext } from "@calcom/trpc/server/createContext";
import { createResponseMetaData } from "@calcom/trpc/server/createResponseMetaData";
import { apiKeysRouter } from "@calcom/trpc/server/routers/viewer/apiKeys/_router";

export default trpcNext.createNextApiHandler({
  router: apiKeysRouter,
  /**
   * @link https://trpc.io/docs/context
   */
  createContext: ({ req, res }) => {
    return createTrpcContext({ req, res });
  },
  /**
   * @link https://trpc.io/docs/error-handling
   */
  onError({ error }) {
    if (error.code === "INTERNAL_SERVER_ERROR") {
      // send to bug reporting
      console.error("Something went wrong", error);
    }
  },
  /**
   * Enable query batching
   */
  batching: {
    enabled: true,
  },
  /**
   * @link https://trpc.io/docs/caching#api-response-caching
   */
  responseMeta({ ctx, paths, type, errors }) {
    return createResponseMetaData({ ctx, paths, type, errors });
  },
});
