import { createHmac, randomUUID } from "node:crypto";
import process from "node:process";
import type { NextApiRequest } from "next";
import type { IntegrationOAuthCallbackState } from "../../types";

export function encodeOAuthState(req: NextApiRequest) {
  if (typeof req.query.state !== "string") {
    return undefined;
  }
  const state: IntegrationOAuthCallbackState = JSON.parse(req.query.state);

  const userId = req.session?.user?.id;
  if (userId && process.env.NEXTAUTH_SECRET) {
    state.nonce = randomUUID();
    state.nonceHash = createHmac("sha256", process.env.NEXTAUTH_SECRET)
      .update(`${state.nonce}:${userId}`)
      .digest("hex");
  }

  return JSON.stringify(state);
}
