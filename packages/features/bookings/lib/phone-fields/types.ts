import type { Fields } from "@calcom/features/bookings/lib/getBookingFields";
import type { Workflow } from "@calcom/features/ee/workflows/lib/types";

export type BookingFieldType = Fields[number];

export type WorkflowDataForBookingField = {
  readonly workflow: Workflow;
};

/**
 * Represents a phone number requirement from a workflow
 */
export interface PhoneRequirement {
  readonly workflowId: number;
  readonly type: PhoneRequirementType;
  readonly required: boolean;
  readonly label: string;
}

export type PhoneRequirementType = "sms_reminder" | "whatsapp_reminder" | "ai_phone_call";

/**
 * Context for phone field resolution
 */
export interface PhoneFieldContext {
  readonly workflows: readonly WorkflowDataForBookingField[];
  readonly existingFields: readonly BookingFieldType[];
  readonly isPhoneBasedBooking: boolean;
}

/**
 * Result of phone field resolution
 */
export interface PhoneFieldResolution {
  readonly field: BookingFieldType | null;
  readonly strategy: PhoneFieldStrategy;
  readonly requirements: readonly PhoneRequirement[];
}

/**
 * Strategy for handling phone fields
 */
export enum PhoneFieldStrategy {
  NONE = "none",
  ENHANCE_ATTENDEE_PHONE = "enhance_attendee_phone",
  CREATE_UNIFIED_FIELD = "create_unified_field",
}

/**
 * Phone number resolution priority
 */
export interface PhoneNumberSource {
  readonly fieldName: string;
  readonly priority: number;
  readonly description: string;
}

/**
 * Abstraction for phone field operations
 */
export interface IPhoneFieldResolver {
  resolvePhoneField(context: PhoneFieldContext): PhoneFieldResolution;
  extractPhoneRequirements(workflows: readonly WorkflowDataForBookingField[]): readonly PhoneRequirement[];
  determineStrategy(context: PhoneFieldContext): PhoneFieldStrategy;
}

/**
 * Abstraction for phone number extraction
 */
export interface IPhoneNumberExtractor {
  extractPrimaryPhone(responses: Record<string, unknown>): string | undefined;
  getSources(): readonly PhoneNumberSource[];
}

/**
 * Abstraction for field management
 */
export interface IPhoneFieldManager {
  consolidatePhoneFields(fields: Fields, resolution: PhoneFieldResolution): Fields;
  removeLegacyFields(fields: Fields): Fields;
  replaceField(fields: Fields, oldFieldName: string, newField: BookingFieldType): Fields;
}
