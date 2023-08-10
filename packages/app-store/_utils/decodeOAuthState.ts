import type { NextApiRequest } from "next";

import type { IntegrationOAuthCallbackState } from "../types";

export function decodeOAuthState(req: NextApiRequest) {
  // req.query.state === "" is for slack
  if (typeof req.query.state !== "string" || req.query.state === "") {
    return undefined;
  }
  const state: IntegrationOAuthCallbackState = JSON.parse(req.query.state);

  return state;
}
