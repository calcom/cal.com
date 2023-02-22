import type { NextApiRequest } from "next";

import { integrationOAuthCallbackStateSchema } from "./integrationOAuthCallbackStateSchema";

export function decodeOAuthState(req: NextApiRequest) {
  if (typeof req.query.state !== "string") {
    return undefined;
  }
  const state = integrationOAuthCallbackStateSchema.parse(JSON.parse(req.query.state));

  return state;
}
