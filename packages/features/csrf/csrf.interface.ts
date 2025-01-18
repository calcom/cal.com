import type { IncomingMessage, ServerResponse } from "http";

export interface ICSRF {
  setup(req: IncomingMessage, res: ServerResponse): void;
}
