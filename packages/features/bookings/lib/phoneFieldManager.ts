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

export const getUnifiedPhoneField = (
  workflows: WorkflowDataForBookingField[], 
  existingFields?: Fields
): BookingFieldType | null => {
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

  // Check if attendeePhoneNumber is already visible for phone-based bookings
  const attendeePhoneField = existingFields?.find(f => f.name === "attendeePhoneNumber");
  const isPhoneBasedBooking = attendeePhoneField && !attendeePhoneField.hidden && attendeePhoneField.required;

  const purposeLabels = [...new Set(phoneFieldPurposes.map(p => p.label))];
  
  if (isPhoneBasedBooking) {
    // Enhance existing attendeePhoneNumber field for dual purpose
    const labelSuffix = purposeLabels.length > 0 
      ? ` (Contact & ${purposeLabels.join(", ")})`
      : " (Contact)";

    return {
      ...attendeePhoneField,
      defaultLabel: `phone_number${labelSuffix}`,
      sources: [
        ...attendeePhoneField.sources,
        ...phoneFieldPurposes.map(purpose => ({
          label: purpose.label,
          id: `workflow-${purpose.workflowId}`,
          type: purpose.type,
        }))
      ],
      required: true, // Always required in phone-based bookings
    } as const;
  }

  // Return regular unified field for non-phone-based bookings
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

/**
 * Detects if this is a phone-based booking scenario
 */
export const isPhoneBasedBooking = (bookingFields: Fields): boolean => {
  const attendeePhoneField = bookingFields.find(f => f.name === "attendeePhoneNumber");
  return !!(attendeePhoneField && !attendeePhoneField.hidden && attendeePhoneField.required);
};

export const mapUnifiedPhoneToLegacyFields = (responses: BookingResponses): BookingResponses => {
  const unifiedPhone = responses[UNIFIED_PHONE_NUMBER_FIELD];
  const attendeePhone = responses.attendeePhoneNumber;
  
  // For phone-based bookings, attendeePhoneNumber is the primary field
  // For workflow-only scenarios, unifiedPhoneNumber is primary
  const primaryPhoneValue = attendeePhone || unifiedPhone;
  
  if (!primaryPhoneValue) return responses;
  
  return {
    ...responses,
    [SystemField.Enum.smsReminderNumber]: primaryPhoneValue,
    aiAgentCallPhoneNumber: primaryPhoneValue,
    attendeePhoneNumber: primaryPhoneValue,
    [UNIFIED_PHONE_NUMBER_FIELD]: primaryPhoneValue,
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

/**
 * Gets the primary phone number from responses with enhanced priority logic
 */
export const getPrimaryPhoneNumber = (responses: BookingResponses): string | undefined => {
  // Priority 1: attendeePhoneNumber (for phone-based bookings or dual-purpose fields)
  const attendeePhone = responses.attendeePhoneNumber;
  if (typeof attendeePhone === 'string' && attendeePhone.trim()) {
    return attendeePhone;
  }
  
  // Priority 2: unifiedPhoneNumber (for workflow-only scenarios)
  const unifiedPhone = responses[UNIFIED_PHONE_NUMBER_FIELD];
  if (typeof unifiedPhone === 'string' && unifiedPhone.trim()) {
    return unifiedPhone;
  }
  
  // Priority 3: Legacy fields (for backward compatibility)
  const smsReminder = responses[SystemField.Enum.smsReminderNumber];
  if (typeof smsReminder === 'string' && smsReminder.trim()) {
    return smsReminder;
  }
  
  const aiPhone = responses.aiAgentCallPhoneNumber;
  if (typeof aiPhone === 'string' && aiPhone.trim()) {
    return aiPhone;
  }
  
  return undefined;
};