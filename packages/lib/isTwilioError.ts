/**
 * Check if an error is a Twilio error
 * @param error - The error to check
 * @returns True if the error is a Twilio error
 */
export function isTwilioError(error: unknown): error is Error & {
  code: number;
  status: number;
  moreInfo: string;
} {
  return (
    error instanceof Error &&
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "status" in error &&
    "moreInfo" in error &&
    typeof error.code === "number" &&
    typeof error.status === "number" &&
    typeof error.moreInfo === "string" &&
    error.moreInfo.includes("twilio") && // e.g., `moreInfo: 'https://www.twilio.com/docs/errors/21211'`
    // Twilio error codes span multiple series:
    // - 10000: General API errors (trial limitations, invalid requests)
    // - 20000: Messaging and Voice errors (phone numbers, delivery issues)
    // - 30000: Specific messaging/voice errors (queue overflow, unreachable)
    // - 40000: Client-side errors (SDK issues, Verify SNA)
    // - 60000: WhatsApp-specific errors
    error.code >= 10000 &&
    error.code < 70000
  );
}
