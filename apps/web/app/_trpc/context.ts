import { cookies, headers } from "next/headers";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { createContext } from "@calcom/trpc/server/createContext";
import { createCallerFactory } from "@calcom/trpc/server/trpc";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import type { AnyRouter } from "@trpc/server";

const getTRPCContext = async () => {
  const legacyReq = buildLegacyRequest(await headers(), await cookies());
  return await createContext({ req: legacyReq, res: {} as any }, getServerSession);
};

export async function createRouterCaller<TRouter extends AnyRouter>(router: TRouter) {
  const trpcContext = await getTRPCContext();
  const createCaller = createCallerFactory<TRouter>(router);
  return createCaller(trpcContext);
}
