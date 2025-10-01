import type { WorkflowDataForBookingField } from "@calcom/features/ee/workflows/lib/getWorkflowActionOptions";
import type { BookingFieldType } from "@calcom/features/form-builder/schema";
import { SystemField, UNIFIED_PHONE_NUMBER_FIELD } from "@calcom/features/bookings/lib/SystemField";
import { WorkflowActions } from "@calcom/prisma/enums";
import type { Fields } from "@calcom/features/bookings/lib/getBookingFields";

interface PhoneFieldPurpose {
  type: "sms_reminder" | "whatsapp_reminder" | "ai_phone_call";
  workflowId: number;
  required: boolean;
  label: string;
}

export const getUnifiedPhoneField = (workflows: WorkflowDataForBookingField[]): BookingFieldType | null => {
  const phoneFieldPurposes: PhoneFieldPurpose[] = [];
  
  workflows.forEach((workflow) => {
    workflow.workflow.steps.forEach((step) => {
      if (step.action === WorkflowActions.SMS_ATTENDEE) {
        phoneFieldPurposes.push({ 
          type: "sms_reminder", 
          workflowId: workflow.workflow.id, 
          required: !!step.numberRequired,
          label: "SMS Reminder"
        });
      } else if (step.action === WorkflowActions.WHATSAPP_ATTENDEE) {
        phoneFieldPurposes.push({ 
          type: "whatsapp_reminder", 
          workflowId: workflow.workflow.id, 
          required: !!step.numberRequired,
          label: "WhatsApp Reminder"
        });
      } else if (step.action === WorkflowActions.CAL_AI_PHONE_CALL) {
        phoneFieldPurposes.push({ 
          type: "ai_phone_call", 
          workflowId: workflow.workflow.id, 
          required: true,
          label: "AI Phone Call"
        });
      }
    });
  });

  if (phoneFieldPurposes.length === 0) return null;

  const purposeLabels = [...new Set(phoneFieldPurposes.map(p => p.label))];
  const labelSuffix = purposeLabels.length > 1 
    ? ` (${purposeLabels.join(", ")})`
    : purposeLabels.length === 1 
    ? ` (${purposeLabels[0]})`
    : "";

  return {
    name: UNIFIED_PHONE_NUMBER_FIELD,
    type: "phone",
    defaultLabel: `phone_number${labelSuffix}`,
    defaultPlaceholder: "enter_phone_number",
    editable: "system",
    required: phoneFieldPurposes.some(p => p.required),
    sources: phoneFieldPurposes.map(purpose => ({
      label: purpose.label,
      id: `workflow-${purpose.workflowId}`,
      type: purpose.type,
    })),
  } as const;
};

type BookingResponses = Record<string, unknown>;

export const mapUnifiedPhoneToLegacyFields = (responses: BookingResponses): BookingResponses => {
  const unifiedPhone = responses[UNIFIED_PHONE_NUMBER_FIELD];
  if (!unifiedPhone) return responses;
  
  return {
    ...responses,
    [SystemField.Enum.smsReminderNumber]: unifiedPhone,
    aiAgentCallPhoneNumber: unifiedPhone,
    attendeePhoneNumber: responses.attendeePhoneNumber || unifiedPhone,
  };
};

export const mapLegacyPhoneToUnifiedField = (responses: BookingResponses): BookingResponses => {
  const smsReminder = responses[SystemField.Enum.smsReminderNumber];
  const aiPhone = responses.aiAgentCallPhoneNumber;
  const attendeePhone = responses.attendeePhoneNumber;
  
  const unifiedPhone = responses[UNIFIED_PHONE_NUMBER_FIELD] || smsReminder || aiPhone || attendeePhone;
  
  if (!unifiedPhone) return responses;
  
  return {
    ...responses,
    [UNIFIED_PHONE_NUMBER_FIELD]: unifiedPhone,
  };
};

/**
 * Checks if booking fields contain legacy phone fields that should be migrated
 */
export const hasLegacyPhoneFields = (bookingFields: Fields): boolean => {
  return bookingFields.some(
    field => field.name === SystemField.Enum.smsReminderNumber || 
             field.name === SystemField.Enum.aiAgentCallPhoneNumber
  );
};

/**
 * Removes legacy phone fields from booking fields array
 */
export const removeLegacyPhoneFields = (bookingFields: Fields): Fields => {
  return bookingFields.filter(
    field => field.name !== SystemField.Enum.smsReminderNumber && 
             field.name !== SystemField.Enum.aiAgentCallPhoneNumber
  );
};