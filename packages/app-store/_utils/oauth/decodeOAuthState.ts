import type { NextApiRequest } from "next";

import type { IntegrationOAuthCallbackState } from "../../types";

export function decodeOAuthState(req: NextApiRequest) {
  if (typeof req.query.state !== "string") {
    return undefined;
  }
  const state: IntegrationOAuthCallbackState = JSON.parse(req.query.state);
  if (state.appOnboardingRedirectUrl) {
    state.appOnboardingRedirectUrl = decodeURIComponent(state.appOnboardingRedirectUrl);
  }

  return state;
}
