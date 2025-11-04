import type { NextApiRequest } from "next";

import { ErrorWithCode } from "@calcom/lib/errors";
import { ErrorCode } from "@calcom/lib/errorCodes";

import { getSession } from "./getSession";

type CtxOrReq = { req: NextApiRequest; ctx?: never } | { ctx: { req: NextApiRequest }; req?: never };

export const ensureSession = async (ctxOrReq: CtxOrReq) => {
  const session = await getSession(ctxOrReq);
  if (!session?.user.id) throw new ErrorWithCode(ErrorCode.Unauthorized, "Unauthorized");
  return session;
};
