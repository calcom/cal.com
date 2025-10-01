import type { BookingFieldType } from "@calcom/features/form-builder/schema";
import type { Fields } from "@calcom/features/bookings/lib/getBookingFields";
import { getFieldIdentifier } from "@calcom/features/form-builder/utils/getFieldIdentifier";
import { SystemField, SMS_REMINDER_NUMBER_FIELD, CAL_AI_AGENT_PHONE_NUMBER_FIELD } from "@calcom/features/bookings/lib/SystemField";
import { PhoneFieldStrategy, type IPhoneFieldManager, type PhoneFieldResolution } from "./types";

/**
 * Manages phone field operations with clean separation of concerns
 */
export class PhoneFieldManager implements IPhoneFieldManager {

  consolidatePhoneFields(fields: Fields, resolution: PhoneFieldResolution): Fields {
    let processedFields = this.removeLegacyFields(fields);

    if (!resolution.field) {
      return processedFields;
    }

    switch (resolution.strategy) {
      case PhoneFieldStrategy.ENHANCE_ATTENDEE_PHONE:
        return this.replaceField(processedFields, "attendeePhoneNumber", resolution.field);

      case PhoneFieldStrategy.CREATE_UNIFIED_FIELD:
        // Hide attendeePhoneNumber field when creating unified field to avoid duplicates
        // but keep it for backward compatibility
        processedFields = this.hideAttendeePhoneField(processedFields);
        return this.insertUnifiedField(processedFields, resolution.field);

      default:
        return processedFields;
    }
  }

  removeLegacyFields(fields: Fields): Fields {
    return fields.filter(field => 
      !this.isLegacyPhoneField(field.name)
    );
  }

  replaceField(fields: Fields, oldFieldName: string, newField: BookingFieldType): Fields {
    const fieldIndex = fields.findIndex(f => f.name === oldFieldName);
    
    if (fieldIndex === -1) {
      throw new Error(`Cannot replace field '${oldFieldName}': field not found`);
    }

    const newFields = [...fields];
    newFields[fieldIndex] = newField;
    return newFields;
  }

  private insertUnifiedField(fields: Fields, unifiedField: BookingFieldType): Fields {
    const locationIndex = fields.findIndex(
      f => getFieldIdentifier(f.name) === getFieldIdentifier("location")
    );

    if (locationIndex === -1) {
      // If no location field, append to end
      return [...fields, unifiedField];
    }

    const newFields = [...fields];
    newFields.splice(locationIndex + 1, 0, unifiedField);
    return newFields;
  }

  private hideAttendeePhoneField(fields: Fields): Fields {
    return fields.map(field => {
      if (field.name === "attendeePhoneNumber") {
        return {
          ...field,
          hidden: true,
          required: false
        };
      }
      return field;
    });
  }

  private isLegacyPhoneField(fieldName: string): boolean {
    return fieldName === SMS_REMINDER_NUMBER_FIELD || 
           fieldName === CAL_AI_AGENT_PHONE_NUMBER_FIELD;
  }
}

/**
 * Service for determining phone-based booking scenarios
 */
export class PhoneBookingDetector {
  
  static isPhoneBasedBooking(fields: readonly BookingFieldType[]): boolean {
    const attendeePhoneField = fields.find(f => f.name === "attendeePhoneNumber");
    return !!(attendeePhoneField && !attendeePhoneField.hidden && attendeePhoneField.required);
  }
  
  static hasWorkflowPhoneRequirements(workflows: readonly import("@calcom/features/ee/workflows/lib/getWorkflowActionOptions").WorkflowDataForBookingField[]): boolean {
    return workflows.some(workflow => 
      workflow?.workflow?.steps?.some(step => 
        step.action === "SMS_ATTENDEE" || 
        step.action === "WHATSAPP_ATTENDEE" || 
        step.action === "CAL_AI_PHONE_CALL"
      )
    );
  }
}

/**
 * Service for phone number extraction and mapping
 */
export class PhoneNumberMapper {
  
  /**
   * Maps phone number to all legacy field formats for backward compatibility
   */
  static mapToLegacyFields(responses: Record<string, unknown>): Record<string, unknown> {
    const primaryPhone = PhoneNumberMapper.extractPrimaryPhone(responses);
    
    if (!primaryPhone) {
      return responses;
    }

    return {
      ...responses,
      [SystemField.Enum.smsReminderNumber]: primaryPhone,
      aiAgentCallPhoneNumber: primaryPhone,
      attendeePhoneNumber: primaryPhone,
      unifiedPhoneNumber: primaryPhone,
    };
  }

  /**
   * Extracts primary phone number with priority logic
   */
  static extractPrimaryPhone(responses: Record<string, unknown>): string | undefined {
    // Priority 1: attendeePhoneNumber (for phone-based bookings or dual-purpose fields)
    const attendeePhone = PhoneNumberMapper.extractPhoneValue(responses.attendeePhoneNumber);
    if (attendeePhone) return attendeePhone;
    
    // Priority 2: unifiedPhoneNumber (for workflow-only scenarios)
    const unifiedPhone = PhoneNumberMapper.extractPhoneValue(responses.unifiedPhoneNumber);
    if (unifiedPhone) return unifiedPhone;
    
    // Priority 3: Legacy fields (for backward compatibility)
    const smsReminder = PhoneNumberMapper.extractPhoneValue(responses[SystemField.Enum.smsReminderNumber]);
    if (smsReminder) return smsReminder;
    
    const aiPhone = PhoneNumberMapper.extractPhoneValue(responses.aiAgentCallPhoneNumber);
    if (aiPhone) return aiPhone;
    
    return undefined;
  }

  private static extractPhoneValue(value: unknown): string | undefined {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    
    if (value && typeof value === 'object' && 'value' in value) {
      const objValue = (value as { value: unknown }).value;
      if (typeof objValue === 'string' && objValue.trim()) {
        return objValue.trim();
      }
    }
    
    return undefined;
  }
}