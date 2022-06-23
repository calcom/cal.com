import type { IncomingMessage } from "http";
import { NextMiddleware } from "next-api-middleware";

import type { PrismaClient } from "@calcom/prisma/client";

/** @todo figure how to use the one from `@calcom/types` */
/** @todo: remove once `@calcom/types` is updated with it.*/
declare module "next" {
  export interface NextApiRequest extends IncomingMessage {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: any;
    userId: number;
    method: string;
    prisma: PrismaClient;
    session: { user: { id: number } };
    query: { [key: string]: string | string[] };
    isAdmin: boolean;
  }
}
export const extendRequest: NextMiddleware = async (req, res, next) => {
  await next();
};
