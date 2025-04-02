import { cookies, headers } from "next/headers";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { createContext } from "@calcom/trpc/server/createContext";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

export const getTRPCContext = async () => {
  const legacyReq = buildLegacyRequest(await headers(), await cookies());
  return await createContext({ req: legacyReq, res: {} as any }, getServerSession);
};
