import type { NextRequest } from "next/server";

import type { WorkflowTemplates } from "@calcom/prisma/enums";

export interface SendSmsOptions {
  to: string;
  message: string;
  from?: string;
  userId?: number | null;
  teamId?: number | null;
  isWhatsApp?: boolean;
  template?: WorkflowTemplates;
  contentVariables?: string;
}

export interface ScheduleSmsOptions extends SendSmsOptions {
  scheduledDate: Date;
}

export interface SendSmsResponse {
  success: boolean;
  response: {
    sid?: string;
    error?: string;
    [key: string]: unknown;
  };
}

export interface VerifyNumberResponse {
  success: boolean;
  response: {
    status: string;
    error?: string;
    [key: string]: unknown;
  };
}

export interface CancelSmsOptions {
  referenceId: string;
}

export interface VerifyPhoneOptions {
  phoneNumber: string;
  code?: string;
}

export interface ValidateWebhookOptions {
  requestUrl: string;
  params: object;
  signature: string;
}

export interface PhoneInfoResponse {
  countryCode?: string;
  price?: number | null;
  numSegments?: number | null;
}

export interface SmsProvider {
  /**
   * Send an SMS or WhatsApp message immediately
   */
  sendSms(options: SendSmsOptions): Promise<SendSmsResponse>;

  /**
   * Schedule an SMS or WhatsApp message for future delivery
   */
  scheduleSms(options: ScheduleSmsOptions): Promise<SendSmsResponse>;

  /**
   * Cancel a scheduled message
   */
  cancelSms(options: CancelSmsOptions): Promise<SendSmsResponse>;

  /**
   * Cancel multiple scheduled messages
   */
  cancelMultipleSms(referenceIds: string[]): Promise<SendSmsResponse>;

  /**
   * Send a verification code to a phone number
   */
  sendVerificationCode(options: VerifyPhoneOptions): Promise<SendSmsResponse>;

  /**
   * Verify a code sent to a phone number
   */
  verifyCode(options: VerifyPhoneOptions): Promise<VerifyNumberResponse>;

  /**
   * Validate a webhook request signature
   */
  validateWebhook(options: ValidateWebhookOptions): Promise<boolean>;

  /**
   * Get country code for a phone number
   */
  getCountryCode(phoneNumber: string): Promise<string>;

  /**
   * Get message information (price, segments)
   */
  getMessageInfo(messageId: string): Promise<PhoneInfoResponse>;

  /**
   * Determine opt-out status from incoming webhook request
   */
  determineOptOutType(
    req: NextRequest
  ): Promise<{ phoneNumber: string; optOutStatus: boolean } | { error: string }>;
}
