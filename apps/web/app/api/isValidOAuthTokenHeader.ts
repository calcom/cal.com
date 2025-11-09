import type { NextRequest } from "next/server";

const STANDARD_REQ_CONTENT_TYPE = "application/x-www-form-urlencoded"

export const isValidOAuthTokenHeader = (req: NextRequest) => {
  const contentType = req.headers.get("content-type") || "";
  return contentType.toLowerCase().split(";")[0].trim() === STANDARD_REQ_CONTENT_TYPE
}
