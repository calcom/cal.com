/* eslint-disable @typescript-eslint/no-unused-vars */
import type { IncomingMessage } from "http";
import { Session } from "next-auth";

import "./next-auth";

declare module "next" {
  export interface NextApiRequest extends IncomingMessage {
    session?: Session | null;
  }
}
