// packages/calid/modules/workflows/providers/providerRegistry.ts
import {
  WHATSAPP_CANCELLED_SID,
  WHATSAPP_COMPLETED_SID,
  WHATSAPP_REMINDER_SID,
  WHATSAPP_RESCHEDULED_SID,
} from "@calcom/lib/constants";
import { WorkflowTemplates } from "@calcom/prisma/enums";

import { IcsMobileSmsProvider } from "../services/icsmobile";
import { TwilioSmsProvider } from "../services/twilio";
import type { SmsProvider } from "./type";

const isTestMode = process.env.NEXT_PUBLIC_IS_E2E === "1" || process.env.INTEGRATION_TEST_MODE === "1";

// Initialize Twilio provider
const createTwilioProvider = (): TwilioSmsProvider | null => {
  const accountSid = process.env.TWILIO_SID;
  const authToken = process.env.TWILIO_TOKEN;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SID;

  if (!accountSid || !authToken || !messagingServiceSid) {
    console.warn("Twilio credentials are not configured. SMS provider will not be available.");
    return null;
  }

  return new TwilioSmsProvider({
    accountSid,
    authToken,
    messagingServiceSid,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    whatsappPhoneNumber: process.env.TWILIO_WHATSAPP_PHONE_NUMBER,
    verifySid: process.env.TWILIO_VERIFY_SID,
    whatsappTemplates: {
      [WorkflowTemplates.REMINDER]: WHATSAPP_REMINDER_SID,
      [WorkflowTemplates.CANCELLED]: WHATSAPP_CANCELLED_SID,
      [WorkflowTemplates.RESCHEDULED]: WHATSAPP_RESCHEDULED_SID,
      [WorkflowTemplates.COMPLETED]: WHATSAPP_COMPLETED_SID,
    },
    isTestMode,
  });
};

// Initialize ICSMobile provider
const createIcsMobileProvider = (): IcsMobileSmsProvider | null => {
  const authKey = process.env.ICSMOBILE_AUTH_KEY;

  if (!authKey) {
    console.warn("ICSMobile credentials are not configured. ICSMobile provider will not be available.");
    return null;
  }

  return new IcsMobileSmsProvider({
    authKey,
    isTestMode,
  });
};

// Provider registry - add more providers here as needed
export const smsProviderRegistry: Record<string, SmsProvider | null> = {
  twilio: createTwilioProvider(),
  icsmobile: createIcsMobileProvider(),
  // Future providers can be added here:
};

// Get the default provider (currently Twilio)
export const getDefaultSmsProvider = (): SmsProvider => {
  const provider = smsProviderRegistry.twilio;
  if (!provider) {
    throw new Error("Default SMS provider (Twilio) is not configured");
  }
  return provider;
};

// Get a specific provider by key
export const getSmsProvider = (providerKey: string): SmsProvider => {
  const provider = smsProviderRegistry[providerKey];
  if (!provider) {
    throw new Error(`SMS provider "${providerKey}" is not configured or does not exist`);
  }
  return provider;
};

// Get fallback provider (always Twilio)
export const getFallbackSmsProvider = (): SmsProvider => {
  return getDefaultSmsProvider();
};
