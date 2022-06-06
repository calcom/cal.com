import type { IncomingMessage } from "http";
import { NextMiddleware } from "next-api-middleware";

import type { PrismaClient } from ".prisma/client";

/** @todo figure how to use the one from `@calcom/types`ﬁ */
/** @todo: remove once `@calcom/types` is updated with it.*/
declare module "next" {
  export interface NextApiRequest extends IncomingMessage {
    userId: number;
    method: string;
    prisma: PrismaClient;
    body: any;
    query: { [key: string]: string | string[] };
  }
}
export const extendRequest: NextMiddleware = async (req, res, next) => {
  await next();
};
