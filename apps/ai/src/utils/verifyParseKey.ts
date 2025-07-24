import type { NextRequest } from "next/server";

import { env } from "../env.mjs";

/**
 * Verifies that the request contains the correct parse key.
 * env.PARSE_KEY must be configured as a query param in the sendgrid inbound parse settings.
 */
export const verifyParseKey = (url: NextRequest["url"]) => {
  const verified = new URL(url).searchParams.get("parseKey") === env.PARSE_KEY;

  return verified;
};
