import type { NextPageContext } from "next/types";

import type { CreateTRPCNext } from "@trpc/next";
import { createTRPCNext } from "@trpc/next";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "../server/routers/_app";
import { getTrpcUrl, createTrpcLinks, createQueryClientConfig, transformer } from "./config";
import type { ENDPOINTS } from "./shared";

/**
 * We deploy our tRPC router on multiple lambdas to keep number of imports as small as possible
 * TODO: Make this dynamic based on folders in trpc server?
 */
export type Endpoint = (typeof ENDPOINTS)[number];

/**
 * A set of strongly-typed React hooks from your `AppRouter` type signature with `createTRPCReact`.
 * @link https://trpc.io/docs/v10/react#2-create-trpc-hooks
 */
export const trpc: CreateTRPCNext<AppRouter, NextPageContext, null> = createTRPCNext<
  AppRouter,
  NextPageContext
>({
  config() {
    const url = getTrpcUrl();

    /**
     * If you want to use SSR, you need to use the server's full URL
     * @link https://trpc.io/docs/ssr
     */
    return {
      /**
       * @link https://trpc.io/docs/links
       */
      links: createTrpcLinks(url),
      /**
       * @link https://react-query.tanstack.com/reference/QueryClient
       */
      queryClientConfig: createQueryClientConfig(),
      /**
       * @link https://trpc.io/docs/data-transformers
       */
      transformer,
    };
  },
  /**
   * @link https://trpc.io/docs/ssr
   */
  ssr: false,
});

export { transformer };

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
