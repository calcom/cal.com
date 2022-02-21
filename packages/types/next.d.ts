import type { IncomingMessage } from "http";
import type { Session } from "next-auth";

import "./next-auth";

declare module "next" {
  export interface NextApiRequest extends IncomingMessage {
    session?: Session | null;
  }
}
