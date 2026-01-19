import type { AxiosInstance } from "axios";
import axios from "axios";
import { hash, compare } from "bcryptjs";
import crypto from "crypto";
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
  otpAuthKey?: string; // Separate auth key for OTP messages
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
  smsgid?: string;
  Error?: string;
}

export class IcsMobileSmsProvider implements SmsProvider {
  private config: IcsMobileConfig;
  private client: AxiosInstance;
  private logger = logger.getSubLogger({ prefix: ["[IcsMobileSmsProvider]"] });

  private readonly DEFAULT_API_ENDPOINT = "https://sms.sendmsg.in/datasend";
  private readonly DEFAULT_CANCEL_ENDPOINT = "https://services.sendmsg.in/cancel-scheduled/sms";
  private readonly OTP_EXPIRY_MINUTES = 5;
  private readonly MAX_OTP_ATTEMPTS = 5;
  private readonly OTP_LENGTH = 6;
  private readonly BCRYPT_ROUNDS = 10;

  private otpAuthKey?: string;

  constructor(config: IcsMobileConfig) {
    if (!config.authKey) {
      throw new Error("ICSMobile authKey is required");
    }

    this.config = config;
    this.otpAuthKey = config.otpAuthKey; // Store OTP-specific auth key

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

      const normalizedMessage = Array.isArray(options.message)
        ? options.message.join("")
        : String(options.message)
            .replace(/"\s*\+\s*"/g, "") // defensive: strip accidental concatenation artifacts
            .replace(/\n\s*\n/g, "\n\n"); // normalize blank lines

      // Handle test mode
      if (this.config.isTestMode) {
        setTestSMS({
          to: options.to,
          // from: options.from || ICSMOBILE_SENDERID, //NO support for custom sender here
          from: ICSMOBILE_SENDERID,
          message: normalizedMessage,
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
            smstext: normalizedMessage,
            smsgid: uuidv4(),
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
          // sid: String(firstResponse.mid),
          sid: String(firstResponse.smsgid),
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

      const normalizedMessage = Array.isArray(options.message)
        ? options.message.join("")
        : String(options.message)
            .replace(/"\s*\+\s*"/g, "") // defensive: strip accidental concatenation artifacts
            .replace(/\n\s*\n/g, "\n\n"); // normalize blank lines

      // Handle test mode
      if (this.config.isTestMode) {
        setTestSMS({
          to: options.to,
          // from: options.from || ICSMOBILE_SENDERID, //NO support for custom sender here
          from: ICSMOBILE_SENDERID,
          message: normalizedMessage,
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
            smstext: normalizedMessage,
            smsgid: uuidv4(),
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
          // sid: firstResponse.mid,
          sid: String(firstResponse.smsgid),
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
   * Generate a cryptographically secure 6-digit OTP
   */
  private generateSecureOtp(): string {
    // Generate cryptographically secure random bytes
    const buffer = crypto.randomBytes(4);
    const randomNumber = buffer.readUInt32BE(0);

    // Convert to 6-digit number (000000 - 999999)
    const otp = (randomNumber % 1000000).toString().padStart(this.OTP_LENGTH, "0");

    return otp;
  }

  /**
   * Hash OTP using bcrypt
   */
  private async hashOtp(otp: string): Promise<string> {
    return await hash(otp, this.BCRYPT_ROUNDS);
  }

  /**
   * Verify OTP against hashed value
   */
  private async verifyOtpHash(otp: string, hashedOtp: string): Promise<boolean> {
    return await compare(otp, hashedOtp);
  }

  /**
   * Invalidate all previous active OTPs for a phone number
   */
  private async invalidatePreviousOtps(phoneNumber: string): Promise<void> {
    await prisma.otpVerification.updateMany({
      where: {
        phoneNumber,
        isVerified: false,
        isInvalidated: false,
      },
      data: {
        isInvalidated: true,
      },
    });
  }

  /**
   * Clean up expired OTPs (optional background job)
   */
  private async cleanupExpiredOtps(): Promise<void> {
    const now = new Date();

    await prisma.otpVerification.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { isVerified: true, updatedAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
        ],
      },
    });
  }

  /**
   * Send verification code via SMS
   */
  async sendVerificationCode(options: VerifyPhoneOptions): Promise<SendSmsResponse> {
    try {
      this.logger.debug("Sending verification code", { phoneNumber: options.phoneNumber });

      const formattedPhone = this.formatPhoneNumber(options.phoneNumber);

      // Generate secure OTP
      const otp = this.generateSecureOtp();

      // Hash the OTP
      const hashedOtp = await this.hashOtp(otp);

      // Calculate expiration time
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

      // Invalidate previous OTPs for this phone number
      await this.invalidatePreviousOtps(formattedPhone);

      // Clean up old expired OTPs (async, don't await)
      this.cleanupExpiredOtps().catch((err) => {
        this.logger.error("Error cleaning up expired OTPs", err);
      });

      // Create new OTP record
      const otpRecord = await prisma.otpVerification.create({
        data: {
          phoneNumber: formattedPhone,
          hashedOtp,
          expiresAt,
          attemptCount: 0,
          isVerified: false,
          isInvalidated: false,
        },
      });

      // Prepare SMS message
      const message = `Your verification code for Cal ID is ${otp}. This code will expire in ${this.OTP_EXPIRY_MINUTES} minutes. Do not share it with anyone.`;

      // Create OTP-specific axios client if otpAuthKey is provided
      const otpClient = this.otpAuthKey
        ? axios.create({
            headers: {
              "Content-Type": "application/json",
              Authorization: `Basic ${this.otpAuthKey}`,
            },
            timeout: 30000,
          })
        : this.client;

      // Prepare request payload for direct API call
      const requestPayload: IcsMobileSendRequest = {
        allowunicode: true,
        smstosend: [
          {
            to: formattedPhone,
            from: ICSMOBILE_SENDERID,
            smstext: message,
            smsgid: uuidv4(),
          },
        ],
      };

      const endpoint = this.DEFAULT_API_ENDPOINT;

      this.logger.debug("Sending OTP SMS via ICSMobile", {
        endpoint,
        to: formattedPhone,
        usingOtpAuthKey: !!this.otpAuthKey,
      });

      // Send SMS directly with OTP-specific auth
      const response = await otpClient.post<IcsMobileSendResponse[]>(endpoint, requestPayload);
      const responseData = response.data;

      // Check if response is an array
      if (!Array.isArray(responseData) || responseData.length === 0) {
        // If SMS fails, invalidate the OTP record
        await prisma.otpVerification.update({
          where: { id: otpRecord.id },
          data: { isInvalidated: true },
        });

        return {
          success: false,
          response: {
            error: "Invalid response from ICSMobile API",
          },
        };
      }

      const firstResponse = responseData[0];

      // Check for errors in response
      if (firstResponse.Error) {
        this.logger.error("ICSMobile API error", { error: firstResponse.Error });

        // If SMS fails, invalidate the OTP record
        await prisma.otpVerification.update({
          where: { id: otpRecord.id },
          data: { isInvalidated: true },
        });

        return {
          success: false,
          response: {
            error: `ICSMobile error code: ${firstResponse.Error}`,
          },
        };
      }

      this.logger.info("Verification code sent successfully", {
        phoneNumber: formattedPhone,
        otpId: otpRecord.id,
        sid: firstResponse.smsgid,
      });

      return {
        success: true,
        response: {
          sid: String(firstResponse.smsgid),
          message: "Verification code sent successfully",
          expiresIn: this.OTP_EXPIRY_MINUTES * 60, // seconds
        },
      };
    } catch (error) {
      this.logger.error("Error sending verification code", error);

      return {
        success: false,
        response: {
          error: error instanceof Error ? error.message : "Unknown error occurred",
        },
      };
    }
  }

  /**
   * Verify the submitted OTP code
   */
  async verifyCode(options: VerifyPhoneOptions): Promise<VerifyNumberResponse> {
    try {
      this.logger.debug("Verifying code", { phoneNumber: options.phoneNumber });

      // Validate input
      if (!options.code || options.code.length !== this.OTP_LENGTH) {
        return {
          success: false,
          response: {
            status: "invalid",
            error: "Invalid verification code format",
          },
        };
      }

      const formattedPhone = this.formatPhoneNumber(options.phoneNumber);
      const now = new Date();

      // Find the most recent active OTP for this phone number
      const otpRecord = await prisma.otpVerification.findFirst({
        where: {
          phoneNumber: formattedPhone,
          isVerified: false,
          isInvalidated: false,
          expiresAt: { gt: now },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Check if OTP exists
      if (!otpRecord) {
        this.logger.warn("No active OTP found", { phoneNumber: formattedPhone });

        return {
          success: false,
          response: {
            status: "not_found",
            error: "No active verification code found or code has expired",
          },
        };
      }

      // Check if maximum attempts exceeded
      if (otpRecord.attemptCount >= this.MAX_OTP_ATTEMPTS) {
        this.logger.warn("Maximum OTP attempts exceeded", {
          phoneNumber: formattedPhone,
          otpId: otpRecord.id,
        });

        // Invalidate the OTP
        await prisma.otpVerification.update({
          where: { id: otpRecord.id },
          data: { isInvalidated: true },
        });

        return {
          success: false,
          response: {
            status: "attempts_exceeded",
            error: "Maximum verification attempts exceeded. Please request a new code.",
          },
        };
      }

      // Verify the OTP
      const isValid = await this.verifyOtpHash(options.code, otpRecord.hashedOtp);

      if (!isValid) {
        // Increment attempt count
        await prisma.otpVerification.update({
          where: { id: otpRecord.id },
          data: {
            attemptCount: otpRecord.attemptCount + 1,
          },
        });

        const remainingAttempts = this.MAX_OTP_ATTEMPTS - otpRecord.attemptCount - 1;

        this.logger.warn("Invalid OTP attempt", {
          phoneNumber: formattedPhone,
          otpId: otpRecord.id,
          attempts: otpRecord.attemptCount + 1,
        });

        return {
          success: false,
          response: {
            status: "invalid",
            error: `Invalid verification code. ${remainingAttempts} attempt(s) remaining.`,
            remainingAttempts,
          },
        };
      }

      // OTP is valid - mark as verified
      await prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: {
          isVerified: true,
          attemptCount: otpRecord.attemptCount + 1,
        },
      });

      this.logger.info("OTP verified successfully", {
        phoneNumber: formattedPhone,
        otpId: otpRecord.id,
      });

      return {
        success: true,
        response: {
          status: "approved",
          message: "Phone number verified successfully",
          phoneNumber: formattedPhone,
        },
      };
    } catch (error) {
      this.logger.error("Error verifying code", error);

      return {
        success: false,
        response: {
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error occurred",
        },
      };
    }
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
