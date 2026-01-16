import type { NextRequest } from "next/server";
import TwilioClient from "twilio";
import type { Twilio } from "twilio";
import { v4 as uuidv4 } from "uuid";

import { checkSMSRateLimit } from "@calcom/lib/checkRateLimitAndThrowError";
import { IS_DEV, NGROK_URL, WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { setTestSMS } from "@calcom/lib/testSMS";
import prisma from "@calcom/prisma";
import type { WorkflowTemplates } from "@calcom/prisma/enums";
import { SMSLockState } from "@calcom/prisma/enums";

import type {
  SmsProvider,
  SendSmsOptions,
  ScheduleSmsOptions,
  SendSmsResponse,
  CancelSmsOptions,
  VerifyPhoneOptions,
  PhoneInfoResponse,
  VerifyNumberResponse,
  ValidateWebhookOptions,
} from "../config/type";

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  messagingServiceSid: string;
  phoneNumber?: string;
  whatsappPhoneNumber?: string;
  verifySid?: string;
  whatsappTemplates?: Partial<Record<WorkflowTemplates, string>>;
  isTestMode?: boolean;
}

export class TwilioSmsProvider implements SmsProvider {
  private client: Twilio;
  private config: TwilioConfig;
  private logger = logger.getSubLogger({ prefix: ["[TwilioSmsProvider]"] });

  constructor(config: TwilioConfig) {
    if (!config.accountSid || !config.authToken || !config.messagingServiceSid) {
      throw new Error(
        "Twilio configuration is incomplete. Required: accountSid, authToken, messagingServiceSid"
      );
    }

    this.config = config;
    this.client = TwilioClient(config.accountSid, config.authToken);
  }

  /**
   * Get the originator address (from number)
   */
  private getOriginatorAddress(isWhatsApp = false): string {
    if (isWhatsApp) {
      return this.config.whatsappPhoneNumber ? `whatsapp:${this.config.whatsappPhoneNumber}` : "";
    }
    return this.config.phoneNumber || "";
  }

  /**
   * Format recipient number with whatsapp prefix if needed
   */
  private formatRecipientNumber(phoneNumber: string, isWhatsApp = false): string {
    return isWhatsApp ? `whatsapp:${phoneNumber}` : phoneNumber;
  }

  /**
   * Check if user/team is locked from sending SMS
   */
  private async validateSendingPermissions(
    userId?: number | null,
    organizationId?: number | null
  ): Promise<boolean> {
    if (organizationId) {
      const organization = await prisma.team.findFirst({
        where: { id: organizationId },
      });
      return organization?.smsLockState === SMSLockState.LOCKED;
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
   * Build webhook callback URL
   */
  private buildWebhookCallback(useWhatsApp = false): string | undefined {
    const baseUrl = `${IS_DEV ? NGROK_URL : WEBAPP_URL}/api/twilio/webhook`;

    const params = {
      channel: useWhatsApp ? "WHATSAPP" : "SMS",
    };

    return `${baseUrl}?${Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join("&")}`;
  }

  /**
   * Send an SMS or WhatsApp message immediately
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
          to: this.formatRecipientNumber(options.to, options.isWhatsApp),
          from: options.isWhatsApp
            ? this.getOriginatorAddress(options.isWhatsApp)
            : options.from || this.getOriginatorAddress(),
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

      const webhookCallback = this.buildWebhookCallback(options.isWhatsApp);

      const messagePayload: {
        messagingServiceSid: string;
        to: string;
        from: string;
        body?: string;
        contentSid?: string;
        contentVariables?: string;
        statusCallback?: string;
      } = {
        messagingServiceSid: this.config.messagingServiceSid,
        to: this.formatRecipientNumber(options.to, options.isWhatsApp),
        from: options.isWhatsApp
          ? this.getOriginatorAddress(options.isWhatsApp)
          : options.from || this.getOriginatorAddress(),
        ...(webhookCallback && { statusCallback: webhookCallback }),
      };

      if (options.isWhatsApp) {
        // Skip if empty content variables
        if (options.contentVariables === "{}") {
          return { success: true, response: { skipped: true } };
        }

        if (options.template && this.config.whatsappTemplates?.[options.template]) {
          messagePayload.contentSid = this.config.whatsappTemplates[options.template];
        }
        messagePayload.contentVariables = options.contentVariables;
      } else {
        messagePayload.body = options.message;
      }

      const response = await this.client.messages.create(messagePayload);
      return { success: true, response: { ...response } };
    } catch (error) {
      this.logger.error("Error sending SMS", error);
      return {
        success: false,
        response: { error: error instanceof Error ? error.message : "Unknown error" },
      };
    }
  }

  /**
   * Schedule an SMS or WhatsApp message for future delivery
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
          to: this.formatRecipientNumber(options.to, options.isWhatsApp),
          from: options.isWhatsApp
            ? this.getOriginatorAddress(options.isWhatsApp)
            : options.from || this.getOriginatorAddress(),
          message: options.message,
        });
        console.log("Skipped scheduling SMS (test mode). SMS available in globalThis.testSMS");
        return { success: true, response: { sid: `test-${uuidv4()}` } };
      }

      // Check rate limits
      if (!options.teamId && options.userId) {
        await checkSMSRateLimit({
          identifier: `sms:user:${options.userId}`,
          rateLimitingType: "smsMonth",
        });
      }

      const webhookCallback = this.buildWebhookCallback(options.isWhatsApp);

      const scheduledPayload: {
        messagingServiceSid: string;
        to: string;
        scheduleType: "fixed";
        sendAt: Date;
        from: string;
        body?: string;
        contentSid?: string;
        contentVariables?: string;
        statusCallback?: string;
      } = {
        messagingServiceSid: this.config.messagingServiceSid,
        to: this.formatRecipientNumber(options.to, options.isWhatsApp),
        scheduleType: "fixed",
        sendAt: options.scheduledDate,
        from: options.isWhatsApp
          ? this.getOriginatorAddress(options.isWhatsApp)
          : options.from || this.getOriginatorAddress(),
        ...(webhookCallback && { statusCallback: webhookCallback }),
      };

      if (options.isWhatsApp) {
        // Skip if empty content variables
        if (options.contentVariables === "{}") {
          return { success: true, response: { skipped: true } };
        }

        scheduledPayload.contentVariables = options.contentVariables;
        if (options.template && this.config.whatsappTemplates?.[options.template]) {
          scheduledPayload.contentSid = this.config.whatsappTemplates[options.template];
        }
      } else {
        scheduledPayload.body = options.message;
      }

      const response = await this.client.messages.create(scheduledPayload);
      return { success: true, response: { ...response } };
    } catch (error) {
      this.logger.error("Error scheduling SMS", error);
      return {
        success: false,
        response: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  /**
   * Cancel a scheduled message
   */
  async cancelSms(options: CancelSmsOptions): Promise<SendSmsResponse> {
    try {
      await this.client.messages(options.referenceId).update({ status: "canceled" });
      return { success: true, response: { canceled: true } };
    } catch (error) {
      this.logger.error(`Error canceling SMS ${options.referenceId}`, error);
      return {
        success: false,
        response: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
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
          return limit(() => this.client.messages(referenceId).update({ status: "canceled" })).catch(
            (error) => {
              this.logger.error(`Error canceling scheduled SMS with id ${referenceId}`, error);
              throw error;
            }
          );
        })
      );

      const failed = results.filter((r) => r.status === "rejected");
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
      this.logger.error("Error canceling multiple SMS", error);
      return {
        success: false,
        response: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  /**
   * Send a verification code to a phone number
   */
  async sendVerificationCode(options: VerifyPhoneOptions): Promise<SendSmsResponse> {
    try {
      if (!this.config.verifySid) {
        return {
          success: false,
          response: { error: "Twilio Verify SID is not configured" },
        };
      }

      await this.client.verify
        .services(this.config.verifySid)
        .verifications.create({ to: options.phoneNumber, channel: "sms" });

      return { success: true, response: { sent: true } };
    } catch (error) {
      this.logger.error("Error sending verification code", error);
      return {
        success: false,
        response: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  /**
   * Verify a code sent to a phone number
   */
  async verifyCode(options: VerifyPhoneOptions): Promise<VerifyNumberResponse> {
    try {
      if (!this.config.verifySid) {
        return {
          success: false,
          response: {
            status: "failed",
            error: "Twilio Verify SID is not configured",
          },
        };
      }

      if (!options.code) {
        return {
          success: false,
          response: {
            status: "failed",
            error: "Verification code is required",
          },
        };
      }

      const verificationResult = await this.client.verify.v2
        .services(this.config.verifySid)
        .verificationChecks.create({ to: options.phoneNumber, code: options.code });

      return {
        success: verificationResult.status === "approved",
        response: { status: verificationResult.status },
      };
    } catch (error) {
      this.logger.error("Error verifying code", error);
      return {
        success: false,
        response: { status: "failed", error: error instanceof Error ? error.message : "Unknown error" },
      };
    }
  }

  /**
   * Get country code for a phone number
   */
  async getCountryCode(phoneNumber: string): Promise<string> {
    try {
      const { countryCode } = await this.client.lookups.v2.phoneNumbers(phoneNumber).fetch();
      return countryCode;
    } catch (error) {
      this.logger.error("Error getting country code", error);
      throw error;
    }
  }

  /**
   * Get message information (price, segments)
   */
  async getMessageInfo(messageId: string): Promise<PhoneInfoResponse> {
    try {
      const message = await this.client.messages(messageId).fetch();
      const price = message.price ? Math.abs(parseFloat(message.price)) : null;
      const numSegments = message.numSegments ? parseInt(message.numSegments) : null;

      return { price, numSegments };
    } catch (error) {
      this.logger.error("Error getting message info", error);
      throw error;
    }
  }

  /**
   * Validate a webhook request signature
   */
  async validateWebhook(options: ValidateWebhookOptions): Promise<boolean> {
    try {
      if (!process.env.TWILIO_TOKEN) {
        throw new Error("TWILIO_TOKEN is not set");
      }
      return TwilioClient.validateRequest(
        this.config.authToken,
        options.signature,
        options.requestUrl,
        options.params
      );
    } catch (error) {
      this.logger.error("Error validating webhook", error);
      return false;
    }
  }

  async determineOptOutType(
    req: NextRequest
  ): Promise<{ phoneNumber: string; optOutStatus: boolean } | { error: string }> {
    const signature = req.headers.get("X-Twilio-Signature");
    if (!signature) return { error: "Missing Twilio signature" };

    const formData = await req.formData();
    const params = Object.fromEntries(formData.entries());

    const isSignatureValid = await this.validateWebhook({
      requestUrl: `${WEBAPP_URL}${req.nextUrl.pathname}`,
      params,
      signature,
    });
    if (!isSignatureValid) return { error: "Invalid signature" };

    if (params["AccountSid"]?.toString() !== process.env.TWILIO_SID) {
      return { error: "Invalid account SID" };
    }

    const phoneNumber = params["From"]?.toString();
    if (!phoneNumber) return { error: "No phone number to handle" };

    const optOutMessage = formData.get("OptOutType")?.toString();
    if (!optOutMessage) return { error: "No opt out message to handle" };
    if (!["STOP", "START"].includes(optOutMessage)) {
      return { error: "Invalid opt out type" };
    }

    return { phoneNumber, optOutStatus: optOutMessage === "STOP" };
  }
}
