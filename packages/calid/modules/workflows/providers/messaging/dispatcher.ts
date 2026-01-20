import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { WorkflowTemplates } from "@calcom/prisma/enums";
import { ServiceName, ServiceProvider } from "@calcom/prisma/enums";

import { FunctionNotImplementedError } from "../../config/types";
import { smsProviderRegistry, getFallbackSmsProvider } from "./config/providerRegistry";
import type {
  SmsProvider,
  SendSmsOptions,
  ScheduleSmsOptions,
  SendSmsResponse,
  PhoneInfoResponse,
  VerifyNumberResponse,
} from "./config/type";

const messagingLogger = logger.getSubLogger({ prefix: ["[MessagingHelper]"] });

/**
 * Cache for the active messaging provider to avoid repeated DB queries
 */
let cachedProvider: {
  provider: SmsProvider;
  providerName: ServiceProvider;
  cachedAt: number;
} | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get the active messaging provider from database
 * @param forceProvider - Optional provider name to force (e.g., for CUSTOM workflows)
 */
async function getActiveMessagingProvider(forceProvider?: ServiceProvider): Promise<{
  provider: SmsProvider;
  providerName: ServiceProvider;
}> {
  // If a specific provider is forced (e.g., Twilio for CUSTOM workflows), use it
  if (forceProvider) {
    const providerKey = forceProvider.toLowerCase();
    const provider = smsProviderRegistry[providerKey];

    if (!provider) {
      throw new Error(
        `Forced messaging provider "${forceProvider}" is not configured in registry. Please check your environment variables.`
      );
    }

    messagingLogger.info(`Forcing messaging provider: ${forceProvider}`);
    return { provider, providerName: forceProvider };
  }

  // Check cache first
  if (cachedProvider && Date.now() - cachedProvider.cachedAt < CACHE_TTL) {
    return {
      provider: cachedProvider.provider,
      providerName: cachedProvider.providerName,
    };
  }

  try {
    // Fetch active provider from database
    const thirdPartyService = await prisma.thirdPartyService.findUnique({
      where: {
        name: ServiceName.MESSAGING,
      },
      select: {
        defaultProvider: true,
      },
    });

    if (!thirdPartyService) {
      messagingLogger.warn("No messaging service configuration found in database. Falling back to Twilio.");
      const providerName = ServiceProvider.TWILIO;
      const provider = smsProviderRegistry[providerName.toLowerCase()];

      if (!provider) {
        throw new Error(`Messaging provider "${providerName}" is not configured in registry`);
      }

      return { provider, providerName };
    }

    const providerName = thirdPartyService.defaultProvider;
    const providerKey = providerName.toLowerCase();
    const provider = smsProviderRegistry[providerKey];

    if (!provider) {
      throw new Error(
        `Messaging provider "${providerName}" is configured in database but not available in registry. Please check your environment variables.`
      );
    }

    messagingLogger.info(`Using messaging provider: ${providerName}`);

    // Update cache
    cachedProvider = {
      provider,
      providerName,
      cachedAt: Date.now(),
    };

    return { provider, providerName };
  } catch (error) {
    messagingLogger.error("Error fetching active messaging provider from database", error);
    throw new Error("Failed to determine active messaging provider");
  }
}

/**
 * Execute a provider method with automatic fallback to Twilio if not implemented
 */
async function executeWithFallback<T>(
  methodName: string,
  primaryExecution: () => Promise<T>,
  fallbackExecution: () => Promise<T>,
  primaryProviderName: string
): Promise<T> {
  try {
    return await primaryExecution();
  } catch (error) {
    if (error instanceof FunctionNotImplementedError) {
      messagingLogger.warn(
        `Method '${methodName}' not implemented by ${primaryProviderName}. Falling back to Twilio.`,
        {
          provider: primaryProviderName,
          method: methodName,
        }
      );

      try {
        return await fallbackExecution();
      } catch (fallbackError) {
        messagingLogger.error(`Fallback to Twilio failed for method '${methodName}'`, fallbackError);
        throw fallbackError;
      }
    }
    throw error;
  }
}

/**
 * Determine if we should force Twilio provider based on workflow template
 * CUSTOM workflows require Twilio because other providers don't support custom SMS bodies
 */
function shouldForceTwilio(template?: WorkflowTemplates): ServiceProvider | undefined {
  if (template === "CUSTOM") {
    messagingLogger.info(
      "CUSTOM workflow detected - forcing Twilio provider (only provider that supports custom SMS bodies)"
    );
    return ServiceProvider.TWILIO;
  }
  return undefined;
}

/**
 * Clear the provider cache (useful for testing or when provider changes)
 */
export function clearMessagingProviderCache(): void {
  cachedProvider = null;
  messagingLogger.info("Messaging provider cache cleared");
}

/**
 * Send an SMS or WhatsApp message immediately using the active provider
 */
export async function sendSMS(
  phoneNumber: string,
  body: string,
  sender: string,
  userId?: number | null,
  teamId?: number | null,
  whatsapp = false,
  template?: WorkflowTemplates,
  contentVariables?: string
): Promise<SendSmsResponse> {
  try {
    // Force Twilio for CUSTOM workflows (other providers don't support custom bodies)
    const forcedProvider = shouldForceTwilio(template);
    const { provider, providerName } = await getActiveMessagingProvider(forcedProvider);
    const fallbackProvider = getFallbackSmsProvider();

    messagingLogger.debug(`Sending SMS via ${providerName}`, {
      to: phoneNumber,
      isWhatsApp: whatsapp,
      userId,
      teamId,
      template,
      forcedProvider: forcedProvider ? "Yes (CUSTOM workflow)" : "No",
    });

    const options: SendSmsOptions = {
      to: phoneNumber,
      message: body,
      from: sender,
      userId,
      teamId,
      isWhatsApp: whatsapp,
      template,
      contentVariables,
    };

    return await executeWithFallback(
      "sendSMS",
      () => provider.sendSms(options),
      () => fallbackProvider.sendSms(options),
      providerName
    );
  } catch (error) {
    messagingLogger.error("Error in sendSMS helper", error);
    return {
      success: false,
      response: {
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
    };
  }
}

/**
 * Schedule an SMS or WhatsApp message for future delivery using the active provider
 */
export async function scheduleSMS(
  phoneNumber: string,
  body: string,
  scheduledDate: Date,
  sender: string,
  userId?: number | null,
  teamId?: number | null,
  whatsapp = false,
  template?: WorkflowTemplates,
  contentVariables?: string
): Promise<SendSmsResponse> {
  try {
    // Force Twilio for CUSTOM workflows (other providers don't support custom bodies)
    const forcedProvider = shouldForceTwilio(template);
    const { provider, providerName } = await getActiveMessagingProvider(forcedProvider);
    const fallbackProvider = getFallbackSmsProvider();

    messagingLogger.debug(`Scheduling SMS via ${providerName}`, {
      to: phoneNumber,
      scheduledDate,
      isWhatsApp: whatsapp,
      userId,
      teamId,
      template,
      forcedProvider: forcedProvider ? "Yes (CUSTOM workflow)" : "No",
    });

    const options: ScheduleSmsOptions = {
      to: phoneNumber,
      message: body,
      from: sender,
      scheduledDate,
      userId,
      teamId,
      isWhatsApp: whatsapp,
      template,
      contentVariables,
    };

    return await executeWithFallback(
      "scheduleSMS",
      () => provider.scheduleSms(options),
      () => fallbackProvider.scheduleSms(options),
      providerName
    );
  } catch (error) {
    messagingLogger.error("Error in scheduleSMS helper", error);
    return {
      success: false,
      response: {
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
    };
  }
}

/**
 * Cancel a scheduled message using the active provider
 */
export async function cancelSMS(referenceId: string): Promise<SendSmsResponse> {
  try {
    const { provider, providerName } = await getActiveMessagingProvider();
    const fallbackProvider = getFallbackSmsProvider();

    messagingLogger.debug(`Canceling SMS via ${providerName}`, { referenceId });

    return await executeWithFallback(
      "cancelSMS",
      () => provider.cancelSms({ referenceId }),
      () => fallbackProvider.cancelSms({ referenceId }),
      providerName
    );
  } catch (error) {
    messagingLogger.error("Error in cancelSMS helper", error);
    return {
      success: false,
      response: {
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
    };
  }
}

/**
 * Cancel multiple scheduled messages using the active provider
 */
export async function deleteMultipleScheduledSMS(referenceIds: string[]): Promise<SendSmsResponse> {
  try {
    const { provider, providerName } = await getActiveMessagingProvider();
    const fallbackProvider = getFallbackSmsProvider();

    messagingLogger.debug(`Canceling multiple SMS via ${providerName}`, {
      count: referenceIds.length,
    });

    return await executeWithFallback(
      "deleteMultipleScheduledSMS",
      () => provider.cancelMultipleSms(referenceIds),
      () => fallbackProvider.cancelMultipleSms(referenceIds),
      providerName
    );
  } catch (error) {
    messagingLogger.error("Error in deleteMultipleScheduledSMS helper", error);
    return {
      success: false,
      response: {
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
    };
  }
}

/**
 * Send a verification code to a phone number using the active provider
 */
export async function sendVerificationCode(phoneNumber: string): Promise<SendSmsResponse> {
  try {
    const { provider, providerName } = await getActiveMessagingProvider();
    const fallbackProvider = getFallbackSmsProvider();

    messagingLogger.debug(`Sending verification code via ${providerName}`, { phoneNumber });

    return await executeWithFallback(
      "sendVerificationCode",
      () => provider.sendVerificationCode({ phoneNumber }),
      () => fallbackProvider.sendVerificationCode({ phoneNumber }),
      providerName
    );
  } catch (error) {
    messagingLogger.error("Error in sendVerificationCode helper", error);
    return {
      success: false,
      response: {
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
    };
  }
}

/**
 * Verify a code sent to a phone number using the active provider
 */
export async function verifyNumber(phoneNumber: string, code: string): Promise<VerifyNumberResponse> {
  try {
    const { provider, providerName } = await getActiveMessagingProvider();
    const fallbackProvider = getFallbackSmsProvider();

    messagingLogger.debug(`Verifying code via ${providerName}`, { phoneNumber });

    return await executeWithFallback<VerifyNumberResponse>(
      "verifyNumber",
      () => provider.verifyCode({ phoneNumber, code }),
      () => fallbackProvider.verifyCode({ phoneNumber, code }),
      providerName
    );
  } catch (error) {
    messagingLogger.error("Error in verifyNumber helper", error);
    return {
      success: false,
      response: {
        error: error instanceof Error ? error.message : "Unknown error occurred",
        status: "failed",
      },
    };
  }
}

/**
 * Validate a webhook request signature using the active provider
 */
export async function validateWebhookRequest(options: {
  requestUrl: string;
  params: object;
  signature: string;
}): Promise<boolean> {
  try {
    const { provider, providerName } = await getActiveMessagingProvider();
    const fallbackProvider = getFallbackSmsProvider();

    messagingLogger.debug(`Validating webhook via ${providerName}`);

    return await executeWithFallback(
      "validateWebhookRequest",
      () => provider.validateWebhook(options),
      () => fallbackProvider.validateWebhook(options),
      providerName
    );
  } catch (error) {
    messagingLogger.error("Error in validateWebhookRequest helper", error);
    return false;
  }
}

/**
 * Get country code for a phone number using the active provider
 */
export async function getCountryCodeForNumber(phoneNumber: string): Promise<string> {
  try {
    const { provider, providerName } = await getActiveMessagingProvider();
    const fallbackProvider = getFallbackSmsProvider();

    messagingLogger.debug(`Getting country code via ${providerName}`, { phoneNumber });

    return await executeWithFallback(
      "getCountryCodeForNumber",
      () => provider.getCountryCode(phoneNumber),
      () => fallbackProvider.getCountryCode(phoneNumber),
      providerName
    );
  } catch (error) {
    messagingLogger.error("Error in getCountryCodeForNumber helper", error);
    throw error;
  }
}

/**
 * Get message information (price, segments) using the active provider
 */
export async function getMessageInfo(messageId: string): Promise<PhoneInfoResponse> {
  try {
    const { provider, providerName } = await getActiveMessagingProvider();
    const fallbackProvider = getFallbackSmsProvider();

    messagingLogger.debug(`Getting message info via ${providerName}`, { messageId });

    return await executeWithFallback(
      "getMessageInfo",
      () => provider.getMessageInfo(messageId),
      () => fallbackProvider.getMessageInfo(messageId),
      providerName
    );
  } catch (error) {
    messagingLogger.error("Error in getMessageInfo helper", error);
    throw error;
  }
}

/**
 * Get the current active messaging provider name (for debugging/logging purposes)
 */
export async function getActiveProviderName(): Promise<ServiceProvider> {
  const { providerName } = await getActiveMessagingProvider();
  return providerName;
}
