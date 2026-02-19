import { createHmac, timingSafeEqual } from "node:crypto";
import process from "node:process";
import type { NextApiRequest } from "next";
import type { IntegrationOAuthCallbackState } from "../../types";

const NONCE_EXEMPT_APPS = new Set(["stripe", "basecamp3", "dub", "webex", "tandem"]);

export function decodeOAuthState(req: NextApiRequest, appSlug?: string) {
  if (typeof req.query.state !== "string") {
    return undefined;
  }
  const state: IntegrationOAuthCallbackState = JSON.parse(req.query.state);

  if (appSlug && NONCE_EXEMPT_APPS.has(appSlug)) {
    return state;
  }

  if (!state.nonce || !state.nonceHash) {
    return undefined;
  }

  const userId = req.session?.user?.id;
  if (!userId || !process.env.NEXTAUTH_SECRET) {
    return undefined;
  }
  const expected = createHmac("sha256", process.env.NEXTAUTH_SECRET)
    .update(`${state.nonce}:${userId}`)
    .digest();
  const actual = Buffer.from(state.nonceHash, "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return undefined;
  }

  return state;
}
