import { createHmac, randomUUID } from "node:crypto";
import process from "node:process";
import type { NextApiRequest } from "next";
import type { IntegrationOAuthCallbackState } from "../../types";

/** Like encodeOAuthState, but takes userId directly instead of reading from req.session.
 *  Needed in getServerSideProps where the session shape differs from NextApiRequest. */
export function signOAuthState(state: IntegrationOAuthCallbackState, userId: number): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return JSON.stringify(state);
  }
  const nonce = randomUUID();
  const nonceHash = createHmac("sha256", secret).update(`${nonce}:${userId}`).digest("hex");
  return JSON.stringify({ ...state, nonce, nonceHash });
}

export function encodeOAuthState(req: NextApiRequest) {
  if (typeof req.query.state !== "string") {
    return undefined;
  }
  const state: IntegrationOAuthCallbackState = JSON.parse(req.query.state);

  const userId = req.session?.user?.id;
  if (!userId) {
    return JSON.stringify(state);
  }

  return signOAuthState(state, userId);
}
