// meta.ts
import { dispatcher, JobName } from "@calid/job-dispatcher";
import type { WhatsAppReminderScheduledJobData } from "@calid/job-engine";
import { QueueName } from "@calid/queue";
import type { Prisma } from "@prisma/client";
import type { Dayjs } from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

import dayjs from "@calcom/dayjs";
import { checkSMSRateLimit } from "@calcom/lib/checkRateLimitAndThrowError";
import { META_API_VERSION } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { WorkflowActions, WorkflowTemplates } from "@calcom/prisma/enums";
import { SMSLockState, WorkflowMethods, WorkflowStatus } from "@calcom/prisma/enums";

import { META_DYNAMIC_TEXT_VARIABLES } from "../config/constants";
import type { VariablesType } from "../templates/customTemplate";
import wordTruncate from "../utils/getTruncatedString";
import { defaultTemplateNamesMap, defaultTemplateComponentsMap } from "./meta_default_templates";

dayjs.extend(utc);
dayjs.extend(timezone);

// Meta error is retriable, other errors shouldn't be retried by inngest else we risk spamming
export class MetaError extends Error {
  message: string;
  cause: any;

  constructor(message: string, cause?: any) {
    super(message);
    this.message = message;
    this.cause = cause;
  }
}

interface MetaMessageConfiguration {
  action: WorkflowActions;
  eventTypeId?: number | null;
  workflowId?: number;
  workflowStepId?: number;
  recipientNumber: string;
  accountId?: number | null;
  organizationId?: number | null;
  templateType?: WorkflowTemplates | null;
  variableData: VariablesType;
  bookingUid?: string | null;
  seatReferenceUid?: string | null;
  // Meta-specific fields
  metaTemplateName?: string | null;
  metaPhoneNumberId?: string | null;
}

interface MetaScheduledMessageConfig extends MetaMessageConfiguration {
  deliveryTimestamp: Date;
  workflowStepId: number;
  bookingUid: string;
}

interface ContentVariableInput {
  workflowStep: { action?: WorkflowActions; template?: WorkflowTemplates };
  booking: {
    eventType: { title?: string } | null;
    startTime: Date;
    user: { locale?: string | null; timeFormat?: number | null } | null;
  };
}

interface MetaScheduledMessage {
  id: string;
  messageId: string | null;
  scheduledAt: Date;
  status: "pending" | "sent" | "failed" | "cancelled";
}

const messageLogger = logger.getSubLogger({ prefix: ["[metaProvider]"] });
const isTestingMode = process.env.NEXT_PUBLIC_IS_E2E || process.env.INTEGRATION_TEST_MODE;

// Meta API Configuration
const META_ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN;
const META_PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
const META_API_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// In-memory scheduled message store (replace with Redis/DB in production)
const scheduledMessages = new Map<string, MetaScheduledMessage>();

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

const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove whatsapp: prefix if present
  let cleaned = phoneNumber.replace(/^whatsapp:/, "");
  // Remove any non-digit characters except +
  cleaned = cleaned.replace(/[^\d+]/g, "");
  return cleaned;
};

interface TemplateComponent {
  type: string;
  format?: string;
  text?: string;
  example?: {
    header_handle?: string[];
    body_text?: string[][];
    body_text_named_params?: Array<{ param_name: string; example: string }>;
    button_params?: string[][];
  };
  buttons?: Array<{
    type: string;
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components: TemplateComponent[];
  sub_category?: string;
  parameter_format?: "NAMED" | "POSITIONAL";
}

const snakeToCamel = (str: string): string => {
  const mapped = META_DYNAMIC_TEXT_VARIABLES[str as keyof typeof META_DYNAMIC_TEXT_VARIABLES] || str;
  const cameled = mapped.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  return cameled;
};

// Key changes to handle only snake_case variable names for Meta

// Updated regex pattern to match only snake_case variables
const SNAKE_CASE_PATTERN = /\{\{([a-z_][a-z0-9_]*)\}\}/g;

const extractTemplateVariables = (
  component: TemplateComponent,
  variableData: ExpandedVariablesType,
  isNamedParams: boolean
): Array<{ type: string; text: string; parameter_name?: string }> => {
  const parameters: Array<{ type: string; text: string; parameter_name?: string }> = [];

  if (!component.text) return parameters;

  // Extract only snake_case variable placeholders: {{variable_name}}
  // Pattern matches: lowercase letter or underscore, followed by any combination of lowercase, digits, underscores
  const paramMatches = component.text.match(SNAKE_CASE_PATTERN);

  if (!paramMatches) return parameters;

  // Get unique parameter names in order of appearance
  const seenParams = new Set<string>();
  const orderedParams: string[] = [];

  paramMatches.forEach((match) => {
    const paramName = match.replace(/\{\{|\}\}/g, "");

    // Additional validation: ensure it's truly snake_case (no camelCase, no uppercase)
    if (/^[a-z_][a-z0-9_]*$/.test(paramName) && !seenParams.has(paramName)) {
      seenParams.add(paramName);
      orderedParams.push(paramName);
    }
  });

  // Build parameters based on format
  orderedParams.forEach((paramName) => {
    // Convert snake_case to camelCase for looking up in variableData
    const camelCaseKey = snakeToCamel(paramName);
    const fieldValue = variableData[camelCaseKey as keyof VariablesType] ?? "";

    // Only include if the value exists and is not undefined
    if (isNamedParams) {
      // Keep snake_case for Meta API parameter_name
      parameters.push({
        type: "text",
        parameter_name: paramName, // Use original snake_case name
        text: String(fieldValue).trim() === "" ? "NA" : String(fieldValue),
      });
    } else {
      parameters.push({
        type: "text",
        text: String(fieldValue).trim() === "" ? "NA" : String(fieldValue),
      });
    }
  });

  return parameters;
};

// Updated button URL extraction to only match snake_case
const extractButtonUrlVariable = (url: string): string | null => {
  const urlMatch = url.match(SNAKE_CASE_PATTERN);
  if (urlMatch && urlMatch[0]) {
    const paramName = urlMatch[0].replace(/\{\{|\}\}/g, "");
    // Validate it's snake_case
    if (/^[a-z_][a-z0-9_]*$/.test(paramName)) {
      return paramName;
    }
  }
  return null;
};

// Add this helper function to upload media to WhatsApp
const uploadMediaToWhatsApp = async (
  mediaUrl: string,
  phoneNumberId: string,
  accessToken: string
): Promise<string | null> => {
  try {
    // Step 1: Download the media from the source URL
    const downloadResponse = await fetch(mediaUrl);

    if (!downloadResponse.ok) {
      messageLogger.error("Failed to download media", {
        url: mediaUrl,
        status: downloadResponse.status,
      });
      return null;
    }

    const mediaBlob = await downloadResponse.blob();
    const contentType = downloadResponse.headers.get("content-type") || "application/octet-stream";

    // Step 2: Upload to WhatsApp's servers
    const formData = new FormData();
    formData.append("messaging_product", "whatsapp");
    formData.append("file", mediaBlob, "media");
    formData.append("type", contentType);

    const uploadUrl = `${META_API_BASE_URL}/${phoneNumberId}/media`;

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({}));
      messageLogger.error("Failed to upload media to WhatsApp", {
        status: uploadResponse.status,
        error: errorData,
      });
      return null;
    }

    const result = await uploadResponse.json();

    // Return the media ID
    return result.id;
  } catch (error) {
    messageLogger.error("Error uploading media to WhatsApp", {
      error: error instanceof Error ? error.message : error,
      mediaUrl,
    });
    return null;
  }
};

type ExpandedVariablesType = VariablesType & {
  recipientName?: string;
  senderName?: string;
  eventStartTimeInAttendeeTimezone?: string;
  eventEndTimeInAttendeeTimezone?: string;
};

const calculateSuffixLength = (templateText: string, variableName: string): number => {
  // Find the variable placeholder in the template
  const variablePattern = new RegExp(`\\{\\{${variableName}\\}\\}`, "g");

  // Replace the variable placeholder with empty string to get surrounding text
  const textWithoutVariable = templateText.replace(variablePattern, "");
  return textWithoutVariable.length + 20 /* +20 cuz meta needs extra buffer */;
};

const getCappedVariables = (
  component: TemplateComponent,
  expandedVariables: ExpandedVariablesType,
  maxTotalLength = 60
): ExpandedVariablesType => {
  if (!component.text) return expandedVariables;

  // Check if event_type_name exists in the template
  const hasEventTypeName = /\{\{event_type_name\}\}/.test(component.text);

  if (!hasEventTypeName) {
    // No event_type_name variable, return as is
    return expandedVariables;
  }

  // Calculate the length of text surrounding the event_type_name variable
  const suffixLength = calculateSuffixLength(component.text, "event_type_name");

  // Calculate max length for event_type_name (accounting for ellipsis)
  const maxLengthForEventTypeName = maxTotalLength - suffixLength; /* for ellipsis */

  return {
    ...expandedVariables,
    eventTypeName: wordTruncate(expandedVariables.eventTypeName, maxLengthForEventTypeName),
  };
};

function formatTimeInTimezone(value: string | Dayjs | undefined | null, timezone: string, format = "h:mma") {
  if (!value) return undefined;

  if (typeof value === "string") {
    return dayjs.utc(value).tz(timezone).format(format);
  }

  return value.format(format);
}

// Update the buildMetaTemplateComponentsFromTemplate function
export const buildMetaTemplateComponentsFromTemplate = async (
  template: WhatsAppTemplate,
  variableData: VariablesType,
  phoneNumberId: string,
  accessToken: string,
  recieverType: "attendee" | "organizer"
): Promise<
  Array<{
    type: string;
    text?: string;
    image?: { id: string };
    video?: { id: string };
    document?: { id: string };
  }>
> => {
  const expandedVariables = {
    ...variableData,
    eventStartTimeInAttendeeTimezone: formatTimeInTimezone(
      variableData.eventStartTimeInAttendeeTimezone,
      variableData.attendeeTimezone
    ),

    eventEndTimeInAttendeeTimezone: formatTimeInTimezone(
      variableData.eventEndTimeInAttendeeTimezone,
      variableData.attendeeTimezone
    ),

    eventStartTime: formatTimeInTimezone(variableData.eventStartTime, variableData.timezone),

    eventEndTime: formatTimeInTimezone(variableData.eventEndTime, variableData.timezone),

    recipientName:
      recieverType === "attendee" ? variableData.attendeeFirstName : variableData.organizerFirstName,
    senderName:
      recieverType === "attendee" ? variableData.organizerFirstName : variableData.attendeeFirstName,
  };
  const components: Array<{
    type: string;
    parameters?: Array<{
      type: string;
      text?: string;
      image?: { id: string };
      video?: { id: string };
      document?: { id: string };
      parameter_name?: string;
    }>;
    index?: string;
    sub_type?: string;
  }> = [];

  const isNamedParams = template.parameter_format === "NAMED";

  for (const component of template.components) {
    const componentType = component.type.toLowerCase();
    console.log("component type: ", componentType);

    // Handle HEADER component with media
    if (component.type === "HEADER") {
      if (component.format === "IMAGE" && component.example?.header_handle?.[0]) {
        // Upload image to WhatsApp and get media ID
        const mediaId = await uploadMediaToWhatsApp(
          component.example.header_handle[0],
          phoneNumberId,
          accessToken
        );

        if (mediaId) {
          components.push({
            type: "header",
            parameters: [
              {
                type: "image",
                image: { id: mediaId }, // Use media ID instead of link
              },
            ],
          });
        }
      } else if (component.format === "VIDEO" && component.example?.header_handle?.[0]) {
        const mediaId = await uploadMediaToWhatsApp(
          component.example.header_handle[0],
          phoneNumberId,
          accessToken
        );

        if (mediaId) {
          components.push({
            type: "header",
            parameters: [
              {
                type: "video",
                video: { id: mediaId },
              },
            ],
          });
        }
      } else if (component.format === "DOCUMENT" && component.example?.header_handle?.[0]) {
        const mediaId = await uploadMediaToWhatsApp(
          component.example.header_handle[0],
          phoneNumberId,
          accessToken
        );

        if (mediaId) {
          components.push({
            type: "header",
            parameters: [
              {
                type: "document",
                document: { id: mediaId },
              },
            ],
          });
        }
      } else if (component.format === "TEXT" && component.text) {
        // Extract snake_case variable placeholders from header text

        const cappedVariables = getCappedVariables(component, expandedVariables);

        const headerParams = extractTemplateVariables(component, cappedVariables, isNamedParams);

        if (headerParams.length > 0) {
          components.push({
            type: "header",
            parameters: headerParams,
          });
        }
      }
    }

    // Handle BODY component
    if (component.type === "BODY" && component.text) {
      const bodyParams = extractTemplateVariables(component, expandedVariables, isNamedParams);
      if (bodyParams.length > 0) {
        components.push({
          type: "body",
          parameters: bodyParams,
        });
      }
    }

    // Handle BUTTONS component (for dynamic URLs or other button parameters)
    if (component.type === "BUTTONS" && component.buttons) {
      component.buttons.forEach((button, index) => {
        if (button.type === "URL" && button.url?.includes("{{")) {
          const fieldName = extractButtonUrlVariable(button.url);

          if (fieldName) {
            const camelCaseKey = snakeToCamel(fieldName);
            const fieldValue = expandedVariables[camelCaseKey as keyof VariablesType];

            if (fieldValue !== undefined) {
              components.push({
                type: "button",
                sub_type: "url",
                index: index.toString(),
                parameters: [
                  {
                    type: "text",
                    text: String(fieldValue).trim() === "" ? "NA" : String(fieldValue),
                  },
                ],
              });
            }
          }
        }
      });
    }
  }

  return components;
};

const createWorkflowInsight = async (
  msgId: string,
  eventTypeId: number,
  workflowId: number | undefined,
  workflowStepId: number | undefined,
  bookingUid?: string | null,
  seatReferenceUid?: string | null
) => {
  await prisma.calIdWorkflowInsights.create({
    data: {
      msgId: msgId,
      eventTypeId: eventTypeId,
      type: WorkflowMethods.WHATSAPP,
      status: WorkflowStatus.QUEUED,
      ...(workflowId && { workflowId: workflowId }),
      ...(workflowStepId && { workflowStepId: workflowStepId }),
      ...(bookingUid && { bookingUid: bookingUid }),
      ...(seatReferenceUid && { bookingSeatReferenceUid: seatReferenceUid }),
    },
  });
};

const sendMetaWhatsAppMessage = async (config: MetaMessageConfiguration) => {
  let result: any;

  try {
    messageLogger.silly(
      "sendMetaWhatsApp",
      JSON.stringify({
        eventTypeId: config.eventTypeId,
        workflowId: config.workflowId,
        phoneNumber: config.recipientNumber,
        userId: config.accountId,
        teamId: config.organizationId,
        metaTemplateName: config.metaTemplateName,
        metaPhoneNumberId: config.metaPhoneNumberId,
      })
    );

    // Determine which phone number ID to use
    const phoneNumberId = config.metaPhoneNumberId || META_PHONE_NUMBER_ID;

    if (!phoneNumberId) {
      throw new Error("No Meta WhatsApp phone number ID configured");
    }

    const credentials = config.metaPhoneNumberId
      ? await prisma.credential.findFirst({
          where: {
            whatsappBusinessPhone: {
              some: {
                phoneNumberId: config.metaPhoneNumberId,
              },
            },
          },
        })
      : null;

    if (!credentials && !META_ACCESS_TOKEN) {
      throw new Error("Meta WhatsApp access token not configured");
    }

    if (!config.metaPhoneNumberId && !META_PHONE_NUMBER_ID) {
      throw new Error("No WhatsApp phone number configured");
    }

    const whatsappPhone = config.metaPhoneNumberId
      ? await prisma.whatsAppBusinessPhone.findFirst({
          where: {
            phoneNumberId: config.metaPhoneNumberId,
          },
        })
      : null;

    if (config.metaPhoneNumberId && !whatsappPhone) {
      throw new Error("WhatsApp Phone Number not found");
    }

    // Find the template from the phone's templates
    const template = config.metaTemplateName
      ? ((whatsappPhone.templates as Prisma.JsonArray).find(
          (e: any) => e?.name === config.metaTemplateName
        ) as WhatsAppTemplate | undefined)
      : config.templateType
      ? defaultTemplateComponentsMap(config.templateType)
      : null;

    if (!template) {
      throw new Error(`Template ${config.metaTemplateName} not found in WhatsApp phone configuration`);
    }

    // Rate limiting
    if (!config.organizationId && config.accountId) {
      await checkSMSRateLimit({
        identifier: `whatsapp:user:${config.accountId}`,
        rateLimitingType: "smsMonth",
      });
    }

    const formattedRecipient = formatPhoneNumber(config.recipientNumber);

    // Build message payload
    const messagePayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedRecipient,
    };

    messagePayload.type = "template";
    messagePayload.template = {
      name: config.metaTemplateName ?? defaultTemplateNamesMap(config.templateType!),
      language: {
        code: template.language || "en",
      },
    };

    // Build components based on template structure and variable mapping
    const components = await buildMetaTemplateComponentsFromTemplate(
      template,
      config.variableData,
      phoneNumberId,
      credentials?.key?.access_token || META_ACCESS_TOKEN!,
      config.action.includes("ATTENDEE") ? "attendee" : "organizer"
    );

    messageLogger.debug("Built template components", {
      templateName: config.metaTemplateName,
      components: JSON.stringify(components),
    });

    if (components.length > 0) {
      messagePayload.template.components = components;
    }

    // Send via Meta WhatsApp Cloud API
    const apiUrl = `${META_API_BASE_URL}/${phoneNumberId}/messages`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${credentials?.key?.access_token || META_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(messagePayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      messageLogger.error("Meta WhatsApp API error", {
        status: response.status,
        error: errorData,
        payload: messagePayload,
      });

      throw new Error(`Meta WhatsApp API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    result = await response.json();

    if (config.eventTypeId) {
      await createWorkflowInsight(
        result.messages?.[0]?.id,
        config.eventTypeId,
        config.workflowId,
        config.workflowStepId,
        config.bookingUid,
        config.seatReferenceUid
      );
    }
  } catch (error) {
    messageLogger.error("Failed to send Meta WhatsApp message", {
      error: error instanceof Error ? error.message : error,
    });

    throw new MetaError(error instanceof Error ? error.message : "Unknown", error);
  }

  messageLogger.debug("Meta WhatsApp message sent successfully", result);

  return {
    sid: result.messages?.[0]?.id,
    messageId: result.messages?.[0]?.id,
  };
};

// Export functions matching Twilio provider interface
export const sendSMS = async (args: {
  action: WorkflowActions;
  eventTypeId?: number | null;
  workflowId?: number;
  workflowStepId?: number;
  phoneNumber: string;
  userId?: number | null;
  teamId?: number | null;
  template?: WorkflowTemplates | null;
  variableData: VariablesType;
  metaTemplateName?: string | null;
  metaPhoneNumberId?: string | null;
  bookingUid?: string | null;
  seatReferenceUid?: string | null;
}) => {
  return sendMetaWhatsAppMessage({
    action: args.action,
    eventTypeId: args.eventTypeId,
    workflowId: args.workflowId,
    workflowStepId: args.workflowStepId,
    recipientNumber: args.phoneNumber,
    accountId: args.userId,
    organizationId: args.teamId,
    templateType: args.template,
    variableData: args.variableData,
    metaTemplateName: args?.metaTemplateName,
    metaPhoneNumberId: args?.metaPhoneNumberId,
    bookingUid: args?.bookingUid,
    seatReferenceUid: args?.seatReferenceUid,
  });
};

export const scheduleSMS = async (args: {
  action: WorkflowActions;
  phoneNumber: string;
  scheduledDate: Date;
  userId?: number | null;
  teamId?: number | null;
  template?: WorkflowTemplates;
  variableData: VariablesType;
  workflowId?: number;
  metaTemplateName: string | null;
  metaPhoneNumberId: string | null;
  workflowStepId: number;
  bookingUid: string;
  seatReferenceUid?: string | null;
  eventTypeId?: number | null;
}) => {
  return scheduleMetaWhatsAppMessage({
    action: args.action,
    recipientNumber: args.phoneNumber,
    accountId: args.userId,
    organizationId: args.teamId,
    templateType: args.template,
    variableData: args.variableData,
    metaTemplateName: args?.metaTemplateName,
    metaPhoneNumberId: args?.metaPhoneNumberId,
    deliveryTimestamp: args.scheduledDate,
    workflowStepId: args?.workflowStepId,
    workflowId: args?.workflowId,
    bookingUid: args?.bookingUid,
    seatReferenceUid: args?.seatReferenceUid,
    eventTypeId: args?.eventTypeId,
  });
};

// export const cancelSMS = async (referenceId: string) => {
//   return cancelMetaScheduledMessage(referenceId);
// };

/**
 * Schedule a WhatsApp message using the job dispatcher for delayed notifications
 */
const scheduleMetaWhatsAppMessage = async (config: MetaScheduledMessageConfig) => {
  // Create a reminder record first (if not exists)
  let reminderId: number;

  // Check if reminder already exists
  const existingReminder = await prisma.calIdWorkflowReminder.findFirst({
    where: {
      bookingUid: config.bookingUid,
      workflowStepId: config.workflowStepId,
      method: "WHATSAPP",
      seatReferenceId: config.seatReferenceUid || null,
      OR: [{ cancelled: false }, { cancelled: null }],
    },
  });

  if (existingReminder) {
    reminderId = existingReminder.id;
  } else {
    const newReminder = await prisma.calIdWorkflowReminder.create({
      data: {
        bookingUid: config.bookingUid,
        workflowStepId: config.workflowStepId,
        method: "WHATSAPP",
        scheduledDate: config.deliveryTimestamp,
        scheduled: false, // Will be marked true after job scheduling
        ...(config.seatReferenceUid && { seatReferenceId: config.seatReferenceUid }),
      },
    });
    reminderId = newReminder.id;
  }

  // Calculate delay until scheduled time
  const now = new Date();
  const delay = Math.max(0, config.deliveryTimestamp.getTime() - now.getTime());

  const payload: WhatsAppReminderScheduledJobData = {
    action: config.action,
    eventTypeId: config.eventTypeId!,
    workflowId: config.workflowId,
    workflowStepId: config.workflowStepId,
    recipientNumber: config.recipientNumber,
    reminderId,
    bookingUid: config.bookingUid,
    scheduledDate: config.deliveryTimestamp.toISOString(),
    variableData: config.variableData,
    userId: config.accountId,
    teamId: config.organizationId,
    template: config.templateType ?? null,
    metaTemplateName: config.metaTemplateName,
    metaPhoneNumberId: config.metaPhoneNumberId,
    seatReferenceUid: config.seatReferenceUid,
  };

  // Schedule with job dispatcher
  try {
    const { jobId } = await dispatcher.dispatch({
      queue: QueueName.SCHEDULED,
      name: JobName.WHATSAPP_REMINDER_SCHEDULED,
      data: payload,
      bullmqOptions: {
        delay,
        attempts: 2,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: {
          age: 86400,
          count: 100,
        },
        removeOnFail: {
          age: 604800,
          count: 1000,
        },
      },
      inngestTs: Date.now() + delay,
    });

    // Mark as scheduled
    await prisma.calIdWorkflowReminder.update({
      where: { id: reminderId },
      data: {
        scheduled: true,
        referenceId: jobId,
      },
    });

    messageLogger.debug(`Scheduled WhatsApp message`, {
      reminderId,
      scheduledDate: config.deliveryTimestamp,
      jobId,
      delay: delay / 1000 / 60, // minutes
    });

    return {
      sid: jobId,
      scheduledId: reminderId,
    };
  } catch (error) {
    messageLogger.error("Failed to schedule with dispatcher", {
      reminderId,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
};

// /**
//  * Cancel a scheduled message
//  */
// const cancelMetaScheduledMessage = async (scheduledId: string) => {
//   try {
//     const reminderId = scheduledId.startsWith("INNGEST_")
//       ? parseInt(scheduledId.replace("INNGEST_", ""))
//       : parseInt(scheduledId);

//     if (isNaN(reminderId)) {
//       messageLogger.warn(`Invalid scheduled ID format: ${scheduledId}`);
//       return;
//     }

//     // Update reminder status - job will handle non-execution
//     const reminder = await prisma.calIdWorkflowReminder.update({
//       where: { id: reminderId },
//       data: {
//         cancelled: true,
//         scheduled: false,
//         referenceId: "CANCELLED",
//       },
//     });

//     if (reminder && reminder.referenceId && reminder.referenceId !== "CANCELLED") {
//       await prisma.calIdWorkflowInsights.update({
//         where: {
//           msgId: reminder.referenceId,
//         },
//         data: {
//           status: WorkflowStatus.CANCELLED,
//         },
//       });
//     }

//     messageLogger.debug(`Cancelled scheduled WhatsApp message ${reminderId}`);
//   } catch (error) {
//     messageLogger.error(`Failed to cancel message ${scheduledId}`, {
//       error: error instanceof Error ? error.message : error,
//     });
//     throw error;
//   }
// };

// export async function deleteMultipleScheduledSMS(referenceIds: string[]) {
//   await Promise.allSettled(
//     referenceIds.map(async (referenceId) => {
//       try {
//         const reminderId = referenceId.startsWith("INNGEST_")
//           ? parseInt(referenceId.replace("INNGEST_", ""))
//           : parseInt(referenceId);

//         if (!isNaN(reminderId)) {
//           const reminder = await prisma.calIdWorkflowReminder.update({
//             where: { id: reminderId },
//             data: {
//               scheduled: false,
//               referenceId: "CANCELLED",
//             },
//           });

//           if (reminder && reminder.referenceId && reminder.referenceId !== "CANCELLED") {
//             await prisma.calIdWorkflowInsights.update({
//               where: {
//                 msgId: reminder.referenceId,
//               },
//               data: {
//                 status: WorkflowStatus.CANCELLED,
//               },
//             });
//           }
//         }
//       } catch (error) {
//         messageLogger.error(`Error canceling scheduled WhatsApp with id ${referenceId}`, error);
//       }
//     })
//   );
// }
