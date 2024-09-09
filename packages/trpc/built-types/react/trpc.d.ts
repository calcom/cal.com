import type { NextPageContext } from "next/types";
import type { CreateTRPCNext } from "../next";
import type { inferRouterInputs, inferRouterOutputs } from "../server";
import type { AppRouter } from "../server/routers/_app";
import { ENDPOINTS } from "./shared";
/**
 * We deploy our tRPC router on multiple lambdas to keep number of imports as small as possible
 * TODO: Make this dynamic based on folders in trpc server?
 */
export type Endpoint = (typeof ENDPOINTS)[number];
/**
 * A set of strongly-typed React hooks from your `AppRouter` type signature with `createTRPCReact`.
 * @link https://trpc.io/docs/v10/react#2-create-trpc-hooks
 */
export declare const trpc: CreateTRPCNext<AppRouter, NextPageContext, null>;
export declare const transformer: {
    stringify: (object: any) => string;
    parse: <T = unknown>(string: string) => T;
    serialize: (object: any) => import("superjson/dist/types").SuperJSONResult;
    deserialize: <T_1 = unknown>(payload: import("superjson/dist/types").SuperJSONResult) => T_1;
    registerClass: (v: import("superjson/dist/types").Class, options?: string | import("superjson/dist/class-registry").RegisterOptions | undefined) => void;
    registerSymbol: (v: Symbol, identifier?: string | undefined) => void;
    registerCustom: <I, O extends import("superjson/dist/types").JSONValue>(transformer: Omit<import("superjson/dist/custom-transformer-registry").CustomTransfomer<I, O>, "name">, name: string) => void;
    allowErrorProps: (...props: string[]) => void;
};
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
