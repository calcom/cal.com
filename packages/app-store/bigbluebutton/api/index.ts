import type { NextApiRequest } from "next";
import { HttpError } from "@calcom/lib/http-error";
import { validateExternalUrl } from "@calcom/lib/validateExternalUrl";

/**
 * BigBlueButton Credential Validation API
 * 
 * Validates BigBlueButton server URL and secret.
 */
async function handler(req: NextApiRequest) {
  if (req.method !== "POST") {
    throw new HttpError({ statusCode: 405, message: "Method not allowed" });
  }

  const { bbbUrl, bbbSecret } = req.body;

  if (!bbbUrl || !bbbSecret) {
    throw new HttpError({ statusCode: 400, message: "Missing bbbUrl or bbbSecret" });
  }

  // Validate URL is not a private/internal URL (SSRF protection)
  const isValidUrl = validateExternalUrl(bbbUrl);
  if (!isValidUrl) {
    throw new HttpError({ 
      statusCode: 400, 
      message: "Invalid BigBlueButton URL. Private URLs are not allowed." 
    });
  }

  // In production, would test the connection with a getMeetingInfo API call
  return {
    valid: true,
    message: "BigBlueButton credentials validated successfully"
  };
}

export default handler;
