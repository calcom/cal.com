import { NextApiRequest } from "next";

export type IntegrationOAuthCallbackState = {
  returnTo: string;
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const encodeOAuthState = (req: NextApiRequest) => {
  if (typeof req.query.state !== "string") {
    return undefined;
  }
  const state: IntegrationOAuthCallbackState = JSON.parse(req.query.state);

  return JSON.stringify(state);
};
