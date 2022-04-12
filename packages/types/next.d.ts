import type { IncomingMessage } from "http";
import type { Session } from "next-auth";

import "./next-auth";

export declare module "next" {
  interface NextApiRequest extends IncomingMessage {
    session?: Session | null;
  }
}
