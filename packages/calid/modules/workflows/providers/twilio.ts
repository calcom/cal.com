import type { NextRequest } from "next/server";
import TwilioClient from "twilio";
import { v4 as uuidv4 } from "uuid";

import dayjs from "@calcom/dayjs";
import { checkSMSRateLimit } from "@calcom/lib/checkRateLimitAndThrowError";
import {
  IS_DEV,
  NGROK_URL,
  WEBAPP_URL,
  WHATSAPP_CANCELLED_SID,
  WHATSAPP_COMPLETED_SID,
  WHATSAPP_REMINDER_SID,
  WHATSAPP_RESCHEDULED_SID,
} from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { setTestSMS } from "@calcom/lib/testSMS";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import prisma from "@calcom/prisma";
import { SMSLockState, WorkflowActions, WorkflowTemplates } from "@calcom/prisma/enums";

interface MessageConfiguration {
  recipientNumber: string;
  textContent: string;
  senderIdentifier: string;
  accountId?: number | null;
  organizationId?: number | null;
  isWhatsApp?: boolean;
  templateType?: WorkflowTemplates;
  variableData?: string;
  additionalParams?: Record<string, any>;
}

interface ScheduledMessageConfig extends MessageConfiguration {
  deliveryTimestamp: Date;
}

interface ContentVariableInput {
  workflowStep: { action?: WorkflowActions; template?: WorkflowTemplates };
  booking: {
    eventType: { title?: string } | null;
    startTime: Date;
    user: { locale?: string | null; timeFormat?: number | null } | null;
  };
}

const messageLogger = logger.getSubLogger({ prefix: ["[twilioProvider]"] });
const isTestingMode = process.env.NEXT_PUBLIC_IS_E2E || process.env.INTEGRATION_TEST_MODE;

const establishTwilioConnection = () => {
  const accountSid = process.env.TWILIO_SID;
  const authToken = process.env.TWILIO_TOKEN;
  const messagingService = process.env.TWILIO_MESSAGING_SID;

  if (accountSid && authToken && messagingService) {
    return TwilioClient(accountSid, authToken);
  }
  throw new Error("Twilio credentials are missing from the .env file");
};

const retrieveOriginatorAddress = (useWhatsApp = false): string => {
  let originatorNumber = process.env.TWILIO_PHONE_NUMBER;
  if (useWhatsApp) {
    originatorNumber = `whatsapp:${process.env.TWILIO_WHATSAPP_PHONE_NUMBER}`;
  }
  return originatorNumber || "";
};

const formatRecipientNumber = (phoneNumber: string, useWhatsApp = false): string => {
  return useWhatsApp ? `whatsapp:${phoneNumber}` : phoneNumber;
};

const validateSendingPermissions = async (
  accountId?: number | null,
  organizationId?: number | null
): Promise<boolean> => {
  if (organizationId) {
    const organizationData = await prisma.team.findFirst({
      where: { id: organizationId },
    });
    return organizationData?.smsLockState === SMSLockState.LOCKED;
  }

  if (accountId) {
    const userMemberships = await prisma.membership.findMany({
      where: { userId: accountId },
      select: {
        team: {
          select: { smsLockState: true },
        },
      },
    });

    const restrictedMembership = userMemberships.find(
      (membership) => membership.team.smsLockState === SMSLockState.LOCKED
    );

    if (!!restrictedMembership) {
      return true;
    }

    const accountData = await prisma.user.findFirst({
      where: { id: accountId },
    });
    return accountData?.smsLockState === SMSLockState.LOCKED;
  }

  return false;
};

const buildWebhookCallback = (parameters?: Record<string, any>, useWhatsApp = false): string | undefined => {
  if (!parameters) return undefined;

  const baseUrl = `${IS_DEV ? NGROK_URL : WEBAPP_URL}/api/twilio/webhook`;

  const enhancedParams = {
    ...parameters,
    msgId: uuidv4(),
    channel: useWhatsApp ? "WHATSAPP" : "SMS",
  };

  return `${baseUrl}?${Object.entries(enhancedParams)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&")}`;
};

const executeMessageDelivery = async (config: MessageConfiguration) => {
  messageLogger.silly(
    "sendSMS",
    JSON.stringify({
      phoneNumber: config.recipientNumber,
      body: config.textContent,
      sender: config.senderIdentifier,
      userId: config.accountId,
      teamId: config.organizationId,
    })
  );

  const isRestricted = await validateSendingPermissions(config.accountId, config.organizationId);

  if (isRestricted) {
    messageLogger.debug(
      `${
        config.organizationId ? `Team id ${config.organizationId} ` : `User id ${config.accountId} `
      } is locked for SMS sending`
    );
    return;
  }

  if (isTestingMode) {
    setTestSMS({
      to: formatRecipientNumber(config.recipientNumber, config.isWhatsApp),
      from: config.isWhatsApp
        ? retrieveOriginatorAddress(config.isWhatsApp)
        : config.senderIdentifier || retrieveOriginatorAddress(),
      message: config.textContent,
    });
    console.log(
      "Skipped sending SMS because process.env.NEXT_PUBLIC_IS_E2E or process.env.INTEGRATION_TEST_MODE is set. SMS are available in globalThis.testSMS"
    );
    return;
  }

  const twilioService = establishTwilioConnection();

  if (!config.organizationId && config.accountId) {
    await checkSMSRateLimit({
      identifier: `sms:user:${config.accountId}`,
      rateLimitingType: "smsMonth",
    });
  }

  const webhookCallback = buildWebhookCallback(config.additionalParams, config.isWhatsApp);

  const messagePayload: {
    messagingServiceSid: string | undefined;
    to: string;
    from: string;
    body?: string;
    contentSid?: string;
    contentVariables?: string;
    statusCallback?: string;
  } = {
    messagingServiceSid: process.env.TWILIO_MESSAGING_SID,
    to: formatRecipientNumber(config.recipientNumber, config.isWhatsApp),
    from: config.isWhatsApp
      ? retrieveOriginatorAddress(config.isWhatsApp)
      : config.senderIdentifier || retrieveOriginatorAddress(),
    ...(webhookCallback && { statusCallback: webhookCallback }),
  };

  if (config.isWhatsApp) {
    if (config.variableData === "{}") return Promise.resolve();

    if (config.templateType) messagePayload.contentSid = whatsappTemplateMap[config.templateType];
    messagePayload.contentVariables = config.variableData;
  } else {
    messagePayload.body = config.textContent;
  }

  const deliveryResponse = await twilioService.messages.create(messagePayload);
  return deliveryResponse;
};

const executeScheduledDelivery = async (config: ScheduledMessageConfig) => {
  const isRestricted = await validateSendingPermissions(config.accountId, config.organizationId);

  if (isRestricted) {
    messageLogger.debug(
      `${
        config.organizationId ? `Team id ${config.organizationId} ` : `User id ${config.accountId} `
      } is locked for SMS sending `
    );
    return;
  }

  if (isTestingMode) {
    setTestSMS({
      to: formatRecipientNumber(config.recipientNumber, config.isWhatsApp),
      from: config.isWhatsApp
        ? retrieveOriginatorAddress(config.isWhatsApp)
        : config.senderIdentifier || retrieveOriginatorAddress(),
      message: config.textContent,
    });
    console.log(
      "Skipped sending SMS because process.env.NEXT_PUBLIC_IS_E2E or process.env.INTEGRATION_TEST_MODE is set. SMS are available in globalThis.testSMS"
    );
    return { sid: uuidv4() };
  }

  const twilioService = establishTwilioConnection();

  if (!config.organizationId && config.accountId) {
    await checkSMSRateLimit({
      identifier: `sms:user:${config.accountId}`,
      rateLimitingType: "smsMonth",
    });
  }

  console.log("Twilio config: ", config);
  const webhookCallback = buildWebhookCallback(config.additionalParams, config.isWhatsApp);

  const scheduledPayload: {
    messagingServiceSid: string | undefined;
    to: string;
    scheduleType: "fixed";
    sendAt: Date;
    from: string;
    body?: string;
    contentSid?: string;
    contentVariables?: string;
    statusCallback?: string;
  } = {
    messagingServiceSid: process.env.TWILIO_MESSAGING_SID,
    to: formatRecipientNumber(config.recipientNumber, config.isWhatsApp),
    scheduleType: "fixed",
    sendAt: config.deliveryTimestamp,
    from: config.isWhatsApp
      ? retrieveOriginatorAddress(config.isWhatsApp)
      : config.senderIdentifier || retrieveOriginatorAddress(),
    ...(webhookCallback && { statusCallback: webhookCallback }),
  };

  if (config.isWhatsApp) {
    if (config.variableData === "{}") return Promise.resolve();
    scheduledPayload.contentVariables = config.variableData;
    if (config.templateType) {
      scheduledPayload.contentSid = whatsappTemplateMap[config.templateType];
    }
  } else {
    scheduledPayload.body = config.textContent;
  }

  const deliveryResponse = await twilioService.messages.create(scheduledPayload);
  return deliveryResponse;
};

const terminateMessage = async (messageReference: string) => {
  const twilioService = establishTwilioConnection();
  await twilioService.messages(messageReference).update({ status: "canceled" });
};

const initiatePhoneVerification = async (phoneNumber: string) => {
  const twilioService = establishTwilioConnection();
  if (process.env.TWILIO_VERIFY_SID) {
    await twilioService.verify
      .services(process.env.TWILIO_VERIFY_SID)
      .verifications.create({ to: phoneNumber, channel: "sms" });
  }
};

const validateVerificationCode = async (phoneNumber: string, verificationCode: string) => {
  const twilioService = establishTwilioConnection();
  if (process.env.TWILIO_VERIFY_SID) {
    try {
      const verificationResult = await twilioService.verify.v2
        .services(process.env.TWILIO_VERIFY_SID)
        .verificationChecks.create({ to: phoneNumber, code: verificationCode });
      return verificationResult.status;
    } catch (error) {
      return "failed";
    }
  }
};

const buildContentVariables = (
  reminderData: ContentVariableInput,
  participantName: string,
  hostName: string,
  timeZoneInfo: string
): Record<number, string> => {
  const { workflowStep, booking } = reminderData;

  const formatTimestamp = (timestamp?: Date, formatString?: string) =>
    dayjs(timestamp?.toISOString() || "")
      .tz(timeZoneInfo)
      .locale(booking?.user?.locale || "en")
      .format(formatString || "YYYY MMM D");

  const variableMapping = {
    1: workflowStep?.action === WorkflowActions.WHATSAPP_ATTENDEE ? participantName : hostName,
    2: booking?.eventType?.title || "",
    3: workflowStep?.action === WorkflowActions.WHATSAPP_ATTENDEE ? hostName : participantName,
    4: formatTimestamp(booking?.startTime, "YYYY MMM D"),
    5: `${formatTimestamp(
      booking?.startTime,
      getTimeFormatStringFromUserTimeFormat(booking?.user?.timeFormat)
    )} ${timeZoneInfo}`,
  };

  switch (workflowStep?.template) {
    case WorkflowTemplates.REMINDER:
    case WorkflowTemplates.CANCELLED:
    case WorkflowTemplates.RESCHEDULED:
      return variableMapping;
    case WorkflowTemplates.COMPLETED:
      return {
        1: variableMapping[1],
        2: variableMapping[2],
        3: variableMapping[4],
        4: variableMapping[5],
      };
    default:
      return {};
  }
};

export const sendSMS = async (
  phoneNumber: string,
  body: string,
  sender: string,
  userId?: number | null,
  teamId?: number | null,
  whatsapp = false,
  template?: WorkflowTemplates,
  contentVariables?: string,
  customArgs?: Record<string, any>
) => {
  return executeMessageDelivery({
    recipientNumber: phoneNumber,
    textContent: body,
    senderIdentifier: sender,
    accountId: userId,
    organizationId: teamId,
    isWhatsApp: whatsapp,
    templateType: template,
    variableData: contentVariables,
    additionalParams: customArgs,
  });
};

export const scheduleSMS = async (
  phoneNumber: string,
  body: string,
  scheduledDate: Date,
  sender: string,
  userId?: number | null,
  teamId?: number | null,
  whatsapp = false,
  template?: WorkflowTemplates,
  contentVariables?: string,
  customArgs?: Record<string, any>
) => {
  return executeScheduledDelivery({
    recipientNumber: phoneNumber,
    textContent: body,
    senderIdentifier: sender,
    accountId: userId,
    organizationId: teamId,
    isWhatsApp: whatsapp,
    templateType: template,
    variableData: contentVariables,
    additionalParams: customArgs,
    deliveryTimestamp: scheduledDate,
  });
};

export const cancelSMS = async (referenceId: string) => {
  return terminateMessage(referenceId);
};

export const sendVerificationCode = async (phoneNumber: string) => {
  return initiatePhoneVerification(phoneNumber);
};

export const verifyNumber = async (phoneNumber: string, code: string) => {
  return validateVerificationCode(phoneNumber, code);
};

export const whatsappTemplateMap: Partial<Record<WorkflowTemplates, string>> = {
  [WorkflowTemplates.REMINDER]: WHATSAPP_REMINDER_SID,
  [WorkflowTemplates.CANCELLED]: WHATSAPP_CANCELLED_SID,
  [WorkflowTemplates.RESCHEDULED]: WHATSAPP_RESCHEDULED_SID,
  [WorkflowTemplates.COMPLETED]: WHATSAPP_COMPLETED_SID,
};

export const generateContentVars = (
  reminder: ContentVariableInput,
  attendeeName: string,
  userName: string,
  timeZone: string
): Record<number, string> => {
  return buildContentVariables(reminder, attendeeName, userName, timeZone);
};

export async function validateWebhookRequest({
  requestUrl,
  params,
  signature,
}: {
  requestUrl: string;
  params: object;
  signature: string;
}) {
  if (!process.env.TWILIO_TOKEN) {
    throw new Error("TWILIO_TOKEN is not set");
  }

  const isSignatureValid = TwilioClient.validateRequest(
    process.env.TWILIO_TOKEN,
    signature,
    requestUrl,
    params
  );
  return isSignatureValid;
}

export async function getCountryCodeForNumber(phoneNumber: string) {
  const twilioService = establishTwilioConnection();
  const { countryCode } = await twilioService.lookups.v2.phoneNumbers(phoneNumber).fetch();
  return countryCode;
}

export async function getMessageInfo(smsSid: string) {
  const twilioService = establishTwilioConnection();
  const message = await twilioService.messages(smsSid).fetch();
  const price = message.price ? Math.abs(parseFloat(message.price)) : null;

  const numSegments = message.numSegments ? parseInt(message.numSegments) : null;

  return { price, numSegments };
}

export async function determineOptOutType(
  req: NextRequest
): Promise<{ phoneNumber: string; optOutStatus: boolean } | { error: string }> {
  const signature = req.headers.get("X-Twilio-Signature");
  if (!signature) return { error: "Missing Twilio signature" };

  const formData = await req.formData();
  const params = Object.fromEntries(formData.entries());

  const isSignatureValid = await validateWebhookRequest({
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

export async function deleteMultipleScheduledSMS(referenceIds: string[]) {
  const twilioService = establishTwilioConnection();

  const pLimit = (await import("p-limit")).default;
  const limit = pLimit(10);

  await Promise.allSettled(
    referenceIds.map((referenceId) => {
      return limit(() => twilioService.messages(referenceId).update({ status: "canceled" })).catch(
        (error) => {
          messageLogger.error(`Error canceling scheduled SMS with id ${referenceId}`, error);
        }
      );
    })
  );
}
