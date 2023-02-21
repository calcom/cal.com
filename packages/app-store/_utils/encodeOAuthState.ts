import type { NextApiRequest } from "next";

import type { IntegrationOAuthCallbackState } from "../types";

export function encodeOAuthState(req: NextApiRequest) {
  if (typeof req.query.state !== "string") {
    return undefined;
  }
  const state: IntegrationOAuthCallbackState = JSON.parse(req.query.state);

  return JSON.stringify(state);
}
