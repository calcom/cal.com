import type { VariablesType } from "@calid/features/modules/workflows/templates/customTemplate";

import type { WorkflowActions, WorkflowTemplates } from "@calcom/prisma/enums";

import type { BaseJob } from "../baseJobType";

export interface TriggerScheduledWebhookData extends BaseJob {
  id: number;
}

export interface SyncWhatsappTemplatesData extends BaseJob {
  // Empty for now, could add filters in the future
  phoneNumberIds?: string[];
}

/**
 * WhatsApp Reminder Scheduled Job Data
 */
export interface WhatsAppReminderScheduledJobData extends BaseJob {
  /**
   * Event type ID
   */
  eventTypeId: number;

  /**
   * Workflow ID
   */
  workflowId: number;

  /**
   * Workflow step ID
   */
  workflowStepId: number;

  /**
   * Recipient phone number
   */
  recipientNumber: string;

  /**
   * Reminder database record ID
   */
  reminderId: number;

  /**
   * Booking UID
   */
  bookingUid: string;

  /**
   * Template variables for WhatsApp message
   */
  variableData: VariablesType;

  /**
   * Scheduled date (ISO string)
   */
  scheduledDate: string;

  /**
   * User ID (nullable)
   */
  userId?: number | null;

  /**
   * Team ID (nullable)
   */
  teamId?: number | null;

  /**
   * Template type (for default templates)
   */
  template: WorkflowTemplates | null;

  /**
   * Meta template name (custom templates)
   */
  metaTemplateName: string | null;

  /**
   * Meta phone number ID
   */
  metaPhoneNumberId: string | null;

  /**
   * Seat reference UID (for multi-seat bookings)
   */
  seatReferenceUid?: string | null;

  /**
   * Workflow action type
   */
  action: WorkflowActions;
}

export type ScheduledJob =
  | TriggerScheduledWebhookData
  | WhatsAppReminderScheduledJobData
  | SyncWhatsappTemplatesData;
