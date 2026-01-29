/**
 * Local interface types for Twilio provider responses.
 * These types prevent the Twilio SDK types from leaking into the public API,
 * which reduces TypeScript compilation time by avoiding the need to resolve
 * the entire Twilio SDK type graph.
 */

/**
 * Minimal interface for SMS/WhatsApp message response.
 * Only includes the properties that are actually used by consumers.
 */
export interface TwilioMessageResponse {
  sid: string;
}

/**
 * Return type for sendSMS function.
 * Returns undefined when SMS sending is locked or in test mode without a mock response.
 */
export type SendSMSResult = TwilioMessageResponse | undefined;

/**
 * Return type for scheduleSMS function.
 * Returns a message response with sid, or undefined when locked.
 */
export type ScheduleSMSResult = TwilioMessageResponse | undefined;

/**
 * Return type for verifyNumber function.
 * Returns the verification status string or undefined.
 */
export type VerifyNumberResult = string | undefined;

/**
 * Return type for getMessageInfo function.
 */
export interface MessageInfo {
  price: number | null;
  numSegments: number | null;
}

/**
 * Return type for determineOptOutType function.
 */
export type OptOutResult = { phoneNumber: string; optOutStatus: boolean } | { error: string };
