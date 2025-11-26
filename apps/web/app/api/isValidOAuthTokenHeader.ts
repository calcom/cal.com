import type { NextRequest } from "next/server";

export const VALID_REQ_CONTENT_TYPE = "application/x-www-form-urlencoded";

export const isValidOAuthTokenHeader = (req: NextRequest): boolean => {
  const headerValue = req.headers.get("content-type");
  if (!headerValue) return false;
  const mimeType = headerValue.toLowerCase().split(";")[0].trim();
  return mimeType === VALID_REQ_CONTENT_TYPE;
};
