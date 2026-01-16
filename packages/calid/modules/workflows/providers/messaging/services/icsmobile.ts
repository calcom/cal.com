import type { AxiosInstance } from "axios";
import axios from "axios";
import type { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";

import { checkSMSRateLimit } from "@calcom/lib/checkRateLimitAndThrowError";
import { ICSMOBILE_SENDERID } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { setTestSMS } from "@calcom/lib/testSMS";
import prisma from "@calcom/prisma";
import { SMSLockState } from "@calcom/prisma/enums";

import { FunctionNotImplementedError } from "../../../config/types";
import type {
  SmsProvider,
  SendSmsOptions,
  ScheduleSmsOptions,
  SendSmsResponse,
  CancelSmsOptions,
  VerifyPhoneOptions,
  ValidateWebhookOptions,
  PhoneInfoResponse,
  VerifyNumberResponse,
} from "../config/type";

export interface IcsMobileConfig {
  authKey: string; // Base64 encoded authkey for Basic Authorization
  isTestMode?: boolean;
}

interface IcsMobileSendRequest {
  allowunicode?: boolean;
  scheduletime?: string; // Format: "YYYY-MM-DD HH:mm:ss"
  smstosend: Array<{
    to: string;
    from: string;
    smstext: string;
    smsgid?: string;
    peid?: string;
    templateid?: string;
  }>;
}

interface IcsMobileSendResponse {
  to: string;
  from?: string;
  mid?: string;
  Error?: string;
}

export class IcsMobileSmsProvider implements SmsProvider {
  private config: IcsMobileConfig;
  private client: AxiosInstance;
  private logger = logger.getSubLogger({ prefix: ["[IcsMobileSmsProvider]"] });

  private readonly DEFAULT_API_ENDPOINT = "https://sms.sendmsg.in/datasend";
  private readonly DEFAULT_CANCEL_ENDPOINT = "https://services.sendmsg.in/cancel-scheduled/sms";

  constructor(config: IcsMobileConfig) {
    if (!config.authKey) {
      throw new Error("ICSMobile authKey is required");
    }

    this.config = config;

    // Create axios instance with default configuration
    this.client = axios.create({
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${config.authKey}`,
      },
      timeout: 30000, // 30 seconds timeout
    });
  }

  /**
   * Format phone number for ICSMobile (expects format: 91xxxxxxxxxx)
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, "");

    // If number doesn't start with country code, assume India (91)
    if (!cleaned.startsWith("91")) {
      cleaned = `91${cleaned}`;
    }

    return cleaned;
  }

  /**
   * Check if user/team is locked from sending SMS
   */
  private async validateSendingPermissions(userId?: number | null, teamId?: number | null): Promise<boolean> {
    if (teamId) {
      const team = await prisma.team.findFirst({
        where: { id: teamId },
      });
      return team?.smsLockState === SMSLockState.LOCKED;
    }

    if (userId) {
      const memberships = await prisma.membership.findMany({
        where: { userId },
        select: {
          team: {
            select: { smsLockState: true },
          },
        },
      });

      const lockedMembership = memberships.find(
        (membership) => membership.team.smsLockState === SMSLockState.LOCKED
      );

      if (lockedMembership) {
        return true;
      }

      const user = await prisma.user.findFirst({
        where: { id: userId },
      });
      return user?.smsLockState === SMSLockState.LOCKED;
    }

    return false;
  }

  /**
   * Send an SMS message immediately
   */
  async sendSms(options: SendSmsOptions): Promise<SendSmsResponse> {
    try {
      this.logger.silly(
        "sendSms",
        JSON.stringify({
          phoneNumber: options.to,
          body: options.message,
          sender: options.from,
          userId: options.userId,
          teamId: options.teamId,
        })
      );

      // Check if user/team is locked
      const isLocked = await this.validateSendingPermissions(options.userId, options.teamId);
      if (isLocked) {
        this.logger.debug(
          `${
            options.teamId ? `Team id ${options.teamId}` : `User id ${options.userId}`
          } is locked for SMS sending`
        );
        return { success: false, response: { error: "SMS sending is locked for this user/team" } };
      }

      // Handle test mode
      if (this.config.isTestMode) {
        setTestSMS({
          to: options.to,
          // from: options.from || ICSMOBILE_SENDERID, //NO support for custom sender here
          from: ICSMOBILE_SENDERID,
          message: options.message,
        });
        console.log("Skipped sending SMS (test mode). SMS available in globalThis.testSMS");
        return { success: true, response: { sid: `test-${uuidv4()}` } };
      }

      // Check rate limits
      if (!options.teamId && options.userId) {
        await checkSMSRateLimit({
          identifier: `sms:user:${options.userId}`,
          rateLimitingType: "smsMonth",
        });
      }

      // WhatsApp is not supported by ICSMobile
      if (options.isWhatsApp) {
        throw new FunctionNotImplementedError(
          "ICSMobile",
          "sendSms",
          "WhatsApp messaging is not supported by ICSMobile"
        );
      }

      // Prepare request payload
      const requestPayload: IcsMobileSendRequest = {
        allowunicode: true,
        smstosend: [
          {
            to: this.formatPhoneNumber(options.to),
            // from: options.from || ICSMOBILE_SENDERID, //NO support for custom sender here
            from: ICSMOBILE_SENDERID,
            smstext: options.message,
          },
        ],
      };

      const endpoint = this.DEFAULT_API_ENDPOINT;

      this.logger.debug("Sending SMS via ICSMobile", { endpoint, to: options.to });

      const response = await this.client.post<IcsMobileSendResponse[]>(endpoint, requestPayload);

      const responseData = response.data;

      // Check if response is an array
      if (!Array.isArray(responseData) || responseData.length === 0) {
        return {
          success: false,
          response: { error: "Invalid response from ICSMobile API" },
        };
      }

      const firstResponse = responseData[0];

      // Check for errors in response
      if (firstResponse.Error) {
        this.logger.error("ICSMobile API error", { error: firstResponse.Error });
        return {
          success: false,
          response: { error: `ICSMobile error code: ${firstResponse.Error}` },
        };
      }

      // Success response
      return {
        success: true,
        response: {
          // masking as sid to maintain consistency
          sid: firstResponse.mid,
          to: firstResponse.to,
          from: firstResponse.from,
        },
      };
    } catch (error) {
      // Re-throw FunctionNotImplementedError to trigger fallback
      if (error instanceof FunctionNotImplementedError) {
        throw error;
      }

      this.logger.error("Error sending SMS via ICSMobile", error);

      if (axios.isAxiosError(error)) {
        return {
          success: false,
          response: {
            error: error.response?.data || error.message,
            statusCode: error.response?.status,
          },
        };
      }

      return {
        success: false,
        response: { error: error instanceof Error ? error.message : "Unknown error" },
      };
    }
  }

  /**
   * Schedule an SMS message for future delivery
   */
  async scheduleSms(options: ScheduleSmsOptions): Promise<SendSmsResponse> {
    try {
      // Check if user/team is locked
      const isLocked = await this.validateSendingPermissions(options.userId, options.teamId);
      if (isLocked) {
        this.logger.debug(
          `${
            options.teamId ? `Team id ${options.teamId}` : `User id ${options.userId}`
          } is locked for SMS sending`
        );
        return { success: false, response: { error: "SMS sending is locked for this user/team" } };
      }

      // Handle test mode
      if (this.config.isTestMode) {
        setTestSMS({
          to: options.to,
          // from: options.from || ICSMOBILE_SENDERID, //NO support for custom sender here
          from: ICSMOBILE_SENDERID,
          message: options.message,
        });
        console.log("Skipped scheduling SMS (test mode). SMS available in globalThis.testSMS");
        return { success: true, response: { mid: `test-scheduled-${uuidv4()}` } };
      }

      // Check rate limits
      if (!options.teamId && options.userId) {
        await checkSMSRateLimit({
          identifier: `sms:user:${options.userId}`,
          rateLimitingType: "smsMonth",
        });
      }

      // WhatsApp is not supported by ICSMobile
      if (options.isWhatsApp) {
        throw new FunctionNotImplementedError(
          "ICSMobile",
          "scheduleSms",
          "WhatsApp messaging is not supported by ICSMobile"
        );
      }

      // Format schedule time as "YYYY-MM-DD HH:mm:ss" and IST Adjusted
      const scheduleTime = new Date(options.scheduledDate.getTime() + 5.5 * 60 * 60 * 1000)
        .toISOString()
        .replace("T", " ")
        .substring(0, 19);

      // Prepare request payload
      const requestPayload: IcsMobileSendRequest = {
        allowunicode: true,
        scheduletime: scheduleTime,
        smstosend: [
          {
            to: this.formatPhoneNumber(options.to),
            // from: options.from || ICSMOBILE_SENDERID, //NO support for custom sender here
            from: ICSMOBILE_SENDERID,
            smstext: options.message,
          },
        ],
      };

      const endpoint = this.DEFAULT_API_ENDPOINT;

      this.logger.debug("Scheduling SMS via ICSMobile", {
        endpoint,
        to: options.to,
        scheduleTime,
      });

      const response = await this.client.post<IcsMobileSendResponse[]>(endpoint, requestPayload);

      const responseData = response.data;

      // Check if response is an array
      if (!Array.isArray(responseData) || responseData.length === 0) {
        return {
          success: false,
          response: { error: "Invalid response from ICSMobile API" },
        };
      }

      const firstResponse = responseData[0];

      // Check for errors in response
      if (firstResponse.Error) {
        this.logger.error("ICSMobile API error", { error: firstResponse.Error });
        return {
          success: false,
          response: { error: `ICSMobile error code: ${firstResponse.Error}` },
        };
      }

      // Success response
      return {
        success: true,
        response: {
          // masking as sid to maintain consistency
          sid: firstResponse.mid,
          to: firstResponse.to,
          from: firstResponse.from,
        },
      };
    } catch (error) {
      // Re-throw FunctionNotImplementedError to trigger fallback
      if (error instanceof FunctionNotImplementedError) {
        throw error;
      }

      this.logger.error("Error scheduling SMS via ICSMobile", error);

      if (axios.isAxiosError(error)) {
        return {
          success: false,
          response: {
            error: error.response?.data || error.message,
            statusCode: error.response?.status,
          },
        };
      }

      return {
        success: false,
        response: { error: error instanceof Error ? error.message : "Unknown error" },
      };
    }
  }

  /**
   * Cancel a scheduled message
   */
  async cancelSms(options: CancelSmsOptions): Promise<SendSmsResponse> {
    try {
      const endpoint = this.DEFAULT_CANCEL_ENDPOINT;

      this.logger.debug("Canceling SMS via ICSMobile", {
        endpoint,
        referenceId: options.referenceId,
      });

      // Cancel by MID (message ID)
      const response = await this.client.post(endpoint, {
        mid: options.referenceId,
      });

      return {
        success: true,
        response: { canceled: true, data: response.data },
      };
    } catch (error) {
      this.logger.error(`Error canceling SMS via ICSMobile: ${options.referenceId}`, error);

      if (axios.isAxiosError(error)) {
        return {
          success: false,
          response: {
            error: error.response?.data || error.message,
            statusCode: error.response?.status,
          },
        };
      }

      return {
        success: false,
        response: { error: error instanceof Error ? error.message : "Unknown error" },
      };
    }
  }

  /**
   * Cancel multiple scheduled messages
   */
  async cancelMultipleSms(referenceIds: string[]): Promise<SendSmsResponse> {
    try {
      const pLimit = (await import("p-limit")).default;
      const limit = pLimit(10);

      const results = await Promise.allSettled(
        referenceIds.map((referenceId) => {
          return limit(() => this.cancelSms({ referenceId }));
        })
      );

      const failed = results.filter(
        (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.success)
      );

      if (failed.length > 0) {
        return {
          success: false,
          response: {
            message: `Failed to cancel ${failed.length} out of ${referenceIds.length} messages`,
            failed,
          },
        };
      }

      return { success: true, response: { canceled: referenceIds.length } };
    } catch (error) {
      this.logger.error("Error canceling multiple SMS via ICSMobile", error);
      return {
        success: false,
        response: { error: error instanceof Error ? error.message : "Unknown error" },
      };
    }
  }

  /**
   * Send verification code - NOT SUPPORTED by ICSMobile
   */
  async sendVerificationCode(options: VerifyPhoneOptions): Promise<SendSmsResponse> {
    throw new FunctionNotImplementedError(
      "ICSMobile",
      "sendVerificationCode",
      "Phone verification is not supported by ICSMobile API"
    );
  }

  /**
   * Verify code - NOT SUPPORTED by ICSMobile
   */
  async verifyCode(options: VerifyPhoneOptions): Promise<VerifyNumberResponse> {
    throw new FunctionNotImplementedError(
      "ICSMobile",
      "verifyCode",
      "Phone verification is not supported by ICSMobile API"
    );
  }

  /**
   * Validate webhook - NOT SUPPORTED by ICSMobile
   */
  async validateWebhook(options: ValidateWebhookOptions): Promise<boolean> {
    throw new FunctionNotImplementedError(
      "ICSMobile",
      "validateWebhook",
      "Webhook validation is not supported by ICSMobile API"
    );
  }

  /**
   * Get country code - NOT SUPPORTED by ICSMobile
   */
  async getCountryCode(phoneNumber: string): Promise<string> {
    throw new FunctionNotImplementedError(
      "ICSMobile",
      "getCountryCode",
      "Phone lookup is not supported by ICSMobile API"
    );
  }

  /**
   * Get message info - NOT SUPPORTED by ICSMobile
   */
  async getMessageInfo(messageId: string): Promise<PhoneInfoResponse> {
    throw new FunctionNotImplementedError(
      "ICSMobile",
      "getMessageInfo",
      "Message info retrieval is not supported by ICSMobile API"
    );
  }

  async determineOptOutType(
    req: NextRequest
  ): Promise<{ phoneNumber: string; optOutStatus: boolean } | { error: string }> {
    throw new FunctionNotImplementedError(
      "ICSMobile",
      "determineOptOutType",
      "Opt-out determination is not supported by ICSMobile API"
    );
  }
}
