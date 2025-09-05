import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { createContext } from "@calcom/trpc/server/createContext";
import { createCallerFactory } from "@calcom/trpc/server/trpc";
import type { TRPCContext } from "@calcom/trpc/types/server/createContext";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import type { AnyRouter } from "@trpc/server";
import type { ReadonlyHeaders, ReadonlyRequestCookies } from "app/_types";
import { cookies, headers } from "next/headers";

export const getTRPCContext = async (_headers?: ReadonlyHeaders, _cookies?: ReadonlyRequestCookies) => {
  const legacyReq = buildLegacyRequest(_headers ?? (await headers()), _cookies ?? (await cookies()));
  return await createContext({ req: legacyReq, res: {} as any }, getServerSession);
};

export async function createRouterCaller<TRouter extends AnyRouter>(router: TRouter, context?: TRPCContext) {
  const trpcContext = context ? context : await getTRPCContext();
  const createCaller = createCallerFactory<TRouter>(router);
  return createCaller(trpcContext);
}
