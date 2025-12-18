import type { ReadonlyHeaders, ReadonlyRequestCookies } from "app/_types";
import { cookies, headers } from "next/headers";
import type { NextApiResponse } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { createContext } from "@calcom/trpc/server/createContext";
import { createCallerFactory } from "@calcom/trpc/server/trpc";
import type { TRPCContext } from "@calcom/trpc/types/server/createContext";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import type { AnyRouter } from "@trpc/server";

export const getTRPCContext = async (_headers?: ReadonlyHeaders, _cookies?: ReadonlyRequestCookies) => {
  const legacyReq = buildLegacyRequest(_headers ?? (await headers()), _cookies ?? (await cookies()));
  // res is not used by getServerSession (it only uses req), so we pass an empty object
  return await createContext({ req: legacyReq, res: {} as unknown as NextApiResponse }, getServerSession);
};

export async function createRouterCaller<TRouter extends AnyRouter>(router: TRouter, context?: TRPCContext) {
  const trpcContext = context ? context : await getTRPCContext();
  const createCaller = createCallerFactory<TRouter>(router);
  return createCaller(trpcContext);
}
