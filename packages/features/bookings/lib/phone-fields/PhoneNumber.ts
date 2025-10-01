import type { PhoneNumberSource } from "./types";
import { SystemField, UNIFIED_PHONE_NUMBER_FIELD } from "@calcom/features/bookings/lib/SystemField";

/**
 * Value object representing a phone number with its source
 */
export class PhoneNumber {
  private constructor(
    private readonly value: string,
    private readonly source: PhoneNumberSource
  ) {}

  static fromResponses(responses: Record<string, unknown>): PhoneNumber | null {
    const sources = PhoneNumber.getExtractionSources();
    
    for (const source of sources) {
      const value = responses[source.fieldName];
      const phoneValue = PhoneNumber.extractPhoneValue(value);
      
      if (phoneValue) {
        return new PhoneNumber(phoneValue, source);
      }
    }
    
    return null;
  }

  static create(value: string, source: PhoneNumberSource): PhoneNumber {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      throw new Error("Phone number cannot be empty");
    }
    return new PhoneNumber(trimmedValue, source);
  }

  getValue(): string {
    return this.value;
  }

  getSource(): PhoneNumberSource {
    return this.source;
  }

  isFromAttendeeField(): boolean {
    return this.source.fieldName === "attendeePhoneNumber";
  }

  isFromWorkflowField(): boolean {
    return this.source.fieldName === UNIFIED_PHONE_NUMBER_FIELD || 
           this.source.fieldName === SystemField.Enum.smsReminderNumber ||
           this.source.fieldName === "aiAgentCallPhoneNumber";
  }

  /**
   * Maps this phone number to all legacy field formats for backward compatibility
   */
  toLegacyFieldMap(): Record<string, string> {
    return {
      [SystemField.Enum.smsReminderNumber]: this.value,
      aiAgentCallPhoneNumber: this.value,
      attendeePhoneNumber: this.value,
      [UNIFIED_PHONE_NUMBER_FIELD]: this.value,
    };
  }

  private static extractPhoneValue(value: unknown): string | null {
    // Handle string values
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    
    // Handle object values with .value property (form responses)
    if (value && typeof value === 'object' && 'value' in value) {
      const objValue = (value as { value: unknown }).value;
      if (typeof objValue === 'string' && objValue.trim()) {
        return objValue.trim();
      }
    }
    
    return null;
  }

  private static getExtractionSources(): readonly PhoneNumberSource[] {
    return [
      {
        fieldName: "attendeePhoneNumber",
        priority: 1,
        description: "Primary attendee contact phone number"
      },
      {
        fieldName: UNIFIED_PHONE_NUMBER_FIELD,
        priority: 2,
        description: "Unified workflow phone number"
      },
      {
        fieldName: SystemField.Enum.smsReminderNumber,
        priority: 3,
        description: "SMS reminder phone number"
      },
      {
        fieldName: "aiAgentCallPhoneNumber",
        priority: 4,
        description: "AI agent call phone number"
      }
    ];
  }
}